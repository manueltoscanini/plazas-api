const mongoose = require('mongoose');
const Report = require('../models/Report');
const Square = require('../models/PublicSquare');
const { WC, Playground, Ramp, Hazard } = require('../models/elements');

const THRESHOLD = parseInt(process.env.REPORT_AUTO_THRESHOLD, 10) || 3;

const MODELS = { WC, Playground, Ramp, Hazard };
const EXISTS_FLAG = {
  WC: 'wc.exists',
  Playground: 'playground.exists',
  Ramp: 'ramps.exists',
  Hazard: 'hazards.exists',
};
const KEY_RE = /^(add|modify|delete)(WC|Playground|Ramp|Hazard)$/;
const FIELDS = ['description', 'picture', 'lat', 'lon', 'accessible'];

function pick(data) {
  const out = {};
  for (const f of FIELDS) if (data[f] !== undefined) out[f] = data[f];
  return out;
}

function validateChanges(changes) {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes) || !Object.keys(changes).length) {
    return 'changes debe ser un objeto con al menos un cambio';
  }
  for (const [key, data] of Object.entries(changes)) {
    const m = key.match(KEY_RE);
    if (!m) return `Cambio desconocido: ${key}`;
    if (!data || typeof data !== 'object') return `${key} debe ser un objeto`;
    if (m[1] === 'add') {
      if (typeof data.lat !== 'number' || typeof data.lon !== 'number') {
        return `${key} requiere lat y lon numéricos`;
      }
    } else if (!mongoose.isValidObjectId(data.id)) {
      return `${key} requiere un id válido`;
    }
  }
  return null;
}

// Aplica los cambios de un reporte aprobado y recalcula los "exists" de la plaza
async function applyChanges(report) {
  const squareId = report.publicSquareId;
  const touched = new Set();

  for (const [key, data] of Object.entries(report.changes)) {
    const [, action, type] = key.match(KEY_RE);
    const Model = MODELS[type];
    touched.add(type);

    if (action === 'add') {
      await Model.create({ ...pick(data), publicSquareId: squareId });
    } else if (action === 'modify') {
      await Model.findOneAndUpdate(
        { _id: data.id, publicSquareId: squareId },
        { $set: pick(data) },
        { runValidators: true }
      );
    } else {
      await Model.deleteOne({ _id: data.id, publicSquareId: squareId });
    }
  }

  const update = {};
  for (const type of touched) {
    const count = await MODELS[type].countDocuments({ publicSquareId: squareId });
    update[EXISTS_FLAG[type]] = count > 0;
  }
  await Square.findByIdAndUpdate(squareId, { $set: update });
}

// Pasa un reporte de pending a approved/rejected de forma atomica
// (si dos personas lo resuelven a la vez, solo una gana)
async function resolve(reportId, status, extra = {}) {
  return Report.findOneAndUpdate(
    { _id: reportId, status: 'pending' },
    { $set: { status, ...extra } },
    { new: true }
  );
}

// POST /api/reports/create
exports.create = async (req, res) => {
  try {
    const { publicSquareId, changes } = req.body;
    if (!mongoose.isValidObjectId(publicSquareId)) {
      return res.status(400).json({ message: 'publicSquareId inválido' });
    }
    const error = validateChanges(changes);
    if (error) return res.status(400).json({ message: error });

    if (!(await Square.exists({ _id: publicSquareId }))) {
      return res.status(404).json({ message: 'Plaza no encontrada' });
    }

    const report = await Report.create({ publicSquareId, userId: req.user.id, changes });
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/reports/pending?squareId=...
exports.listPending = async (req, res) => {
  try {
    const filter = { status: 'pending' };
    if (req.query.squareId) {
      if (!mongoose.isValidObjectId(req.query.squareId)) {
        return res.status(400).json({ message: 'squareId inválido' });
      }
      filter.publicSquareId = req.query.squareId;
    }
    const reports = await Report.find(filter).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Votacion de usuarios comunes (upvote / downvote)
function voteHandler(isUpvote) {
  return async (req, res) => {
    try {
      const { reportId } = req.body;
      if (!mongoose.isValidObjectId(reportId)) {
        return res.status(400).json({ message: 'reportId inválido' });
      }
      const report = await Report.findById(reportId);
      if (!report) return res.status(404).json({ message: 'Reporte no encontrado' });
      if (report.status !== 'pending') return res.status(409).json({ message: 'El reporte ya fue resuelto' });
      if (report.userId.equals(req.user.id)) {
        return res.status(403).json({ message: 'No podés votar tu propio reporte' });
      }

      const add = isUpvote ? 'autoApprovedBy' : 'autoRejectedBy';
      const remove = isUpvote ? 'autoRejectedBy' : 'autoApprovedBy';

      let updated = await Report.findOneAndUpdate(
        { _id: reportId, status: 'pending' },
        { $addToSet: { [add]: req.user.id }, $pull: { [remove]: req.user.id } },
        { new: true }
      );
      if (!updated) return res.status(409).json({ message: 'El reporte ya fue resuelto' });

      const net = updated.autoApprovedBy.length - updated.autoRejectedBy.length;
      if (net >= THRESHOLD) {
        const approved = await resolve(reportId, 'approved');
        if (approved) {
          await applyChanges(approved);
          updated = approved;
        }
      } else if (-net >= THRESHOLD) {
        updated = (await resolve(reportId, 'rejected')) || updated;
      }

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
}
exports.upvote = voteHandler(true);
exports.downvote = voteHandler(false);

// POST /api/reports/approve   (trusted / admin)
exports.approve = async (req, res) => {
  try {
    const { reportId } = req.body;
    if (!mongoose.isValidObjectId(reportId)) {
      return res.status(400).json({ message: 'reportId inválido' });
    }
    const report = await resolve(reportId, 'approved', { approvedBy: req.user.id });
    if (!report) return res.status(409).json({ message: 'El reporte no existe o ya fue resuelto' });
    await applyChanges(report);
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/reports/reject   (trusted / admin). No aplica los cambios.
exports.reject = async (req, res) => {
  try {
    const { reportId } = req.body;
    if (!mongoose.isValidObjectId(reportId)) {
      return res.status(400).json({ message: 'reportId inválido' });
    }
    const report = await resolve(reportId, 'rejected', { rejectedBy: req.user.id });
    if (!report) return res.status(409).json({ message: 'El reporte no existe o ya fue resuelto' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
