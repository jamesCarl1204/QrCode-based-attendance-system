const aiModel = require('../models/aiModel');
const { askAssistant } = require('../services/aiService');
const { buildTeacherAIContext } = require('../services/aiContextService');
const { fail, serverError } = require('../utils/response');

async function getHistory(req, res) {
  try {
    const messages = await aiModel.history(req.session.user.id, 100);
    return res.json({ success: true, messages });
  } catch (err) {
    return serverError(res, 'AI history error', err);
  }
}

async function ask(req, res) {
  const { question } = req.body || {};
  if (!question || !question.trim()) return fail(res, 400, 'Question is required.');

  try {
    const teacherId = req.session.user.id;
    const history = await aiModel.recent(teacherId, 20);
    // Gemini requires the first history item to be a user message
    while (history.length && history[0].role !== 'user') history.shift();

    const contextData = await buildTeacherAIContext(teacherId);
    const answer = await askAssistant({ question: question.trim(), contextData, history });

    await aiModel.saveExchange(teacherId, question.trim(), answer);
    return res.json({ success: true, answer });
  } catch (err) {
    return serverError(res, 'AI ask error', err, 'The AI assistant could not respond right now. Please try again.');
  }
}

async function clearHistory(req, res) {
  try {
    await aiModel.clear(req.session.user.id);
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, 'AI clear error', err);
  }
}

module.exports = { getHistory, ask, clearHistory };
