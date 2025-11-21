module.exports = (req, res) => {
    res.status(404).json({ message: '존재하지 않는 API입니다.' });
};
