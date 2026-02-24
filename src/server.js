const express = require("express");
require("dotenv").config();

const app = express();
const authRoutes = require("./routes/auth");
const pool = require("./db");
const practiceRoutes = require("./routes/practice");

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/practice", practiceRoutes);

app.get("/", (req, res) => {
    res.json({ message: "CareerGenie Backend Running" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});



app.get("/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS now");
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});