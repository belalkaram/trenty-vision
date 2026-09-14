module.exports = (req, res) => { res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ pong: true, cjs: true, time: new Date().toISOString() })); };
