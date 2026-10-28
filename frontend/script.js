
const STORAGE_KEYS = {
    students: "attendance_students",
    records: "attendance_records"
};

const $ = (id) => document.getElementById(id);

function loadData(key, fallback) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : fallback;
    } catch {
        return fallback;
    }
}

let students = loadData(STORAGE_KEYS.students, []);
let attendanceRecords = loadData(STORAGE_KEYS.records, {});

function saveData() {
    localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(students));
    localStorage.setItem(
        STORAGE_KEYS.records,
        JSON.stringify(attendanceRecords)
    );
}

function getLocalDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function getSelectedDate() {
    return $("attendanceDate").value;
}

function getDayRecords(date = getSelectedDate()) {
    return attendanceRecords[date] || {};
}

function showMessage(text, isError = false) {
    const message = $("message");
    message.textContent = text;
    message.classList.toggle("error", isError);
}

function updateDashboard() {
    const records = getDayRecords();

    let present = 0;
    let absent = 0;
    let late = 0;
    let unmarked = 0;

    students.forEach((student) => {
        const status = records[student.rollNo];

        if (status === "Present") present++;
        else if (status === "Absent") absent++;
        else if (status === "Late") late++;
        else unmarked++;
    });

    $("totalStudents").textContent = students.length;
    $("presentCount").textContent = present;
    $("absentCount").textContent = absent;

    const marked = present + absent + late;
    const rate = marked > 0
        ? Math.round((present / marked) * 100)
        : 0;

    $("attendanceRate").textContent = `${rate}%`;

    $("summaryPresent").textContent = present;
    $("summaryAbsent").textContent = absent;
    $("summaryLate").textContent = late;
    $("summaryUnmarked").textContent = unmarked;
}

function renderStudents() {
    const tbody = $("studentTableBody");
    const search = $("searchInput").value.trim().toLowerCase();
    const records = getDayRecords();

    const filteredStudents = students.filter((student) => {
        return (
            student.rollNo.toLowerCase().includes(search) ||
            student.name.toLowerCase().includes(search) ||
            student.className.toLowerCase().includes(search)
        );
    });

    if (filteredStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-row">
                    No students found. Add a student to get started.
                </td>
            </tr>
        `;

        updateDashboard();
        return;
    }

    tbody.innerHTML = filteredStudents.map((student) => {
        const roll = escapeHTML(student.rollNo);
        const name = escapeHTML(student.name);
        const className = escapeHTML(student.className);
        const currentStatus = records[student.rollNo] || "";

        const options = ["", "Present", "Absent", "Late"]
            .map((status) => {
                const label = status || "Not Marked";
                const selected = status === currentStatus ? "selected" : "";

                return `<option value="${status}" ${selected}>
                    ${label}
                </option>`;
            })
            .join("");

        return `
            <tr>
                <td>${roll}</td>
                <td>${name}</td>
                <td>${className}</td>
                <td>
                    <select
                        class="status-select"
                        data-roll="${roll}"
                        aria-label="Attendance status for ${name}"
                    >
                        ${options}
                    </select>
                </td>
                <td>
                    <button
                        class="delete-btn"
                        data-delete="${roll}"
                        type="button"
                    >
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    updateDashboard();
}

// Add a student
$("studentForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const rollNo = $("rollNo").value.trim();
    const name = $("studentName").value.trim();
    const className = $("studentClass").value.trim();
    const email = $("studentEmail").value.trim();

    if (!rollNo || !name || !className) {
        showMessage("Please fill in all required fields.", true);
        return;
    }

    const duplicate = students.some(
        (student) =>
            student.rollNo.toLowerCase() === rollNo.toLowerCase()
    );

    if (duplicate) {
        showMessage("This roll number already exists.", true);
        return;
    }

    students.push({
        rollNo,
        name,
        className,
        email
    });

    saveData();
    $("studentForm").reset();

    renderStudents();
    showMessage("Student added successfully.");
});

// Change the displayed attendance status
$("studentTableBody").addEventListener("change", (event) => {
    if (!event.target.matches(".status-select")) return;

    const rollNo = event.target.dataset.roll;
    const date = getSelectedDate();

    if (!attendanceRecords[date]) {
        attendanceRecords[date] = {};
    }

    const status = event.target.value;

    if (status) {
        attendanceRecords[date][rollNo] = status;
    } else {
        delete attendanceRecords[date][rollNo];
    }

    // Save the selected status immediately.
    saveData();
    updateDashboard();
    showMessage("Status updated. Click Save Attendance to confirm.");
});

// Delete a student and their associated attendance records
$("studentTableBody").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete]");

    if (!button) return;

    const rollNo = button.dataset.delete;
    const student = students.find((item) => item.rollNo === rollNo);

    if (!student) return;

    if (!confirm(`Delete student ${student.name} (${rollNo})?`)) {
        return;
    }

    students = students.filter((item) => item.rollNo !== rollNo);

    Object.values(attendanceRecords).forEach((records) => {
        delete records[rollNo];
    });

    saveData();
    renderStudents();
    showMessage("Student deleted successfully.");
});

// Save attendance for the selected date
$("saveAttendance").addEventListener("click", () => {
    const date = getSelectedDate();

    if (!date) {
        showMessage("Please select a date.", true);
        return;
    }

    const records = getDayRecords(date);

    const markedCount = students.filter(
        (student) => records[student.rollNo]
    ).length;

    saveData();
    updateDashboard();

    showMessage(
        `Attendance saved for ${date}. ${markedCount} of ${students.length} students marked.`
    );
});

// Search students
$("searchInput").addEventListener("input", renderStudents);

// Display attendance for a different date
$("attendanceDate").addEventListener("change", () => {
    renderStudents();
    showMessage(`Showing attendance for ${getSelectedDate()}.`);
});

// Export selected date's attendance to CSV
$("exportCsv").addEventListener("click", () => {
    const date = getSelectedDate();
    const records = getDayRecords(date);

    const rows = [
        ["Date", "Roll Number", "Student Name", "Class", "Email", "Status"]
    ];

    students.forEach((student) => {
        rows.push([
            date,
            student.rollNo,
            student.name,
            student.className,
            student.email || "",
            records[student.rollNo] || "Not Marked"
        ]);
    });

    const csv = rows.map((row) =>
        row.map((value) => {
            let safeValue = String(value ?? "");

            // Prevent spreadsheet formula injection.
            if (/^[=+\-@\t\r]/.test(safeValue)) {
                safeValue = "'" + safeValue;
            }

            return `"${safeValue.replace(/"/g, '""')}"`;
        }).join(",")
    ).join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `attendance-${date}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    showMessage("Attendance CSV exported successfully.");
});

// Initialize the application
$("attendanceDate").value = getLocalDate();

$("todayDate").textContent = new Date().toLocaleDateString(
    undefined,
    {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    }
);

renderStudents();
