
const express = require("express");
const supabase = require("../supabase");

const router = express.Router();

function validText(value, maxLength) {
    return typeof value === "string" &&
        value.trim().length > 0 &&
        value.trim().length <= maxLength;
}

// GET /api/students
router.get("/", async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from("students")
            .select("id, name, roll_number, created_at")
            .order("roll_number", { ascending: true });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        next(error);
    }
});

// POST /api/students
router.post("/", async (req, res, next) => {
    try {
        const { name, roll_number } = req.body;

        if (!validText(name, 80) || !validText(roll_number, 30)) {
            return res.status(400).json({
                error: "Enter a valid student name and roll number."
            });
        }

        const student = {
            name: name.trim(),
            roll_number: roll_number.trim()
        };

        const { data, error } = await supabase
            .from("students")
            .insert(student)
            .select("id, name, roll_number, created_at")
            .single();

        if (error) {
            if (error.code === "23505") {
                return res.status(409).json({
                    error: "This roll number already exists."
                });
            }

            throw error;
        }

        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/students/:id
router.delete("/:id", async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
            return res.status(400).json({
                error: "Invalid student ID."
            });
        }

        const { data, error } = await supabase
            .from("students")
            .delete()
            .eq("id", id)
            .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({
                error: "Student not found."
            });
        }

        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

module.exports = router;