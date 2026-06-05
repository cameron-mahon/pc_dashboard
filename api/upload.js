const { handleUpload } = require('@vercel/blob');
const crypto = require('crypto');

function getSessionUserId(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/(?:^|;\s*)pc_session=([^;]+)/);
  if (!match) return null;
  const token = match[1];
  const dot = token.indexOf('.');
  if (dot === -1) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!userId || !sig) return null;
  const secret = process.env.PC_SESSION_SECRET;
  const expected = crypto.createHmac('sha256', secret).update(userId).digest('hex');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return userId;
}

module.exports = async function handler(req, res) {
  const body = await handleUpload({
    body: req.body,
    request: req,
    onBeforeGenerateToken: async (pathname) => {
      const userId = getSessionUserId(req);
      if (!userId) throw new Error('Not signed in');
      return {
        maximumSizeInBytes: 100 * 1024 * 1024,
        allowedContentTypes: ['image/*', 'video/*', 'application/pdf', 'application/octet-stream'],
      };
    },
    onUploadCompleted: async ({ blob }) => {},
  });

  return res.json(body);
};
