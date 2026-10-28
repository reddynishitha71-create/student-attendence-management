
const express = require("express");
const supabase = require("../supabase");

const router = express.Router();

function validDate(value) {
    if (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

function validStudentId(value) {
    return typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// GET /api/attendance?date=YYYY-MM-DD
router.get("/", async (req, res, next) => {
    try {
        const { date } = req.query;

        if (date !== undefined && !validDate(date)) {
            return res.status(400).json({
                error: "Enter a valid date in YYYY-MM-DD format."
            });
        }

        let query = supabase
            .from("attendance")
            .select(`
                id,
                date,
                student_id,
                status,
                student:students (
                    name,
                    roll_number
                )
            `)
            .order("date", { ascending: false });

        if (date) {
            query = query.eq("date", date);
        }

        const { data, error } = await query;

        if (error) throw error;

        const records = data.map(record => ({
            id: record.id,
            date: record.date,
            student_id: record.student_id,
            student_name: record.student?.name ?? "",
            roll_number: record.student?.roll_number ?? "",
            status: record.status
        }));

        res.json(records);
    } catch (error) {
        next(error);
    }
});

// POST /api/attendance
router.post("/", async (req, res, next) => {
    try {
        const { date, records } = req.body;

        if (!validDate(date)) {
            return res.status(400).json({
                error: "A valid attendance date is required."
            });
        }

        if (!Array.isArray(records) ||
            records.length === 0 ||
            records.length > 500) {
            return res.status(400).json({
                error: "Provide between 1 and 500 attendance records."
            });
        }

        const seen = new Set();

        for (const record of records) {
            if (!record ||
                !validStudentId(record.student_id) ||
                !["Present", "Absent"].includes(record.status)) {
                return res.status(400).json({
                    error: "Each record needs a valid student ID and status."
                });
            }

            if (seen.has(record.student_id)) {
                return res.status(400).json({
                    error: "Duplicate student IDs are not allowed."
                });
            }

            seen.add(record.student_id);
        }

        const rows = records.map(record => ({
            student_id: record.student_id,
            date,
            status: record.status
        }));

        const { data, error } = await supabase
            .from("attendance")
            .upsert(rows, {
                onConflict: "student_id,date"
            })
            .select("id, student_id, date, status");

        if (error) {
            if (error.code === "23503") {
                return res.status(400).json({
                    error: "One or more students do not exist."
                });
            }

            throw error;
        }

        res.status(200).json({
            message: "Attendance saved successfully.",
            count: data.length,
            records: data
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;