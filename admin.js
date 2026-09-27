// ===============================
// عناصر الصفحة
// ===============================

const studentForm = document.getElementById("studentForm");

const nameInput = document.getElementById("name");
const passwordInput = document.getElementById("password");
const monthInput = document.getElementById("month");
const gradeInput = document.getElementById("grade");
const attendanceInput = document.getElementById("attendance");
const paymentInput = document.getElementById("payment");

const studentsTableBody =
    document.getElementById("studentsTableBody");

const adminMessage =
    document.getElementById("adminMessage");

const saveBtn =
    document.getElementById("saveBtn");

const cancelBtn =
    document.getElementById("cancelBtn");

const searchStudent =
    document.getElementById("searchStudent");


// ===============================
// جلب بيانات الطلاب
// ===============================

let students =
    JSON.parse(localStorage.getItem("students")) || [];


// الطالب الذي نقوم بتعديله حاليًا
let editingPassword = null;


// ===============================
// عرض الطلاب
// ===============================

function displayStudents(list = students) {

    studentsTableBody.innerHTML = "";
    if (list.length === 0) {

        studentsTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    لا يوجد طلاب
                </td>
            </tr>
        ;`
        return;
    }


    list.forEach(function(student) {

        const row = document.createElement("tr");


        row.innerHTML = `

            <td>${student.name}</td>

            <td>${student.password}</td>

            <td>${student.month}</td>

            <td>${student.grade}</td>

            <td>${student.attendance}</td>

            <td>${student.payment}</td>

            <td>

                <button
                    class="edit-btn"
                    onclick="editStudent('${student.password}')"
                >
                    تعديل
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteStudent('${student.password}')"
                >
                    حذف
                </button>

            </td>

        ;`


        studentsTableBody.appendChild(row);

    });
}


// ===============================
// إضافة / تعديل طالب
// ===============================

studentForm.addEventListener(
    "submit",
    function(e) {

        e.preventDefault();


        const student = {

            name:
                nameInput.value.trim(),

            password:
                passwordInput.value.trim(),

            month:
                monthInput.value.trim(),

            grade:
                gradeInput.value.trim(),

            attendance:
                attendanceInput.value.trim(),

            payment:
                paymentInput.value

        };


        // التأكد من إدخال كلمة المرور
        if (student.password === "") {

            showMessage(
                "من فضلك أدخل كلمة المرور ❌"
            );

            return;
        }


        // =========================
        // تعديل طالب
        // =========================

        if (editingPassword !== null) {

            const index =
                students.findIndex(
                    function(item) {

                        return item.password === editingPassword;

                    }
                );


            if (index !== -1) {

                students[index] = student;

                showMessage(
                    "تم تعديل بيانات الطالب بنجاح ✅"
                );

            }


            editingPassword = null;

            saveBtn.textContent =
                "إضافة الطالب";

            cancelBtn.style.display =
                "none";

        }


        // =========================
        // إضافة طالب جديد
        // =========================

        else {

            const exists =
                students.some(
                    function(item) {
                        return item.password === student.password;

                    }
                );


            if (exists) {

                showMessage(
                    "كلمة المرور مستخدمة بالفعل ❌"
                );

                return;
            }


            students.push(student);


            showMessage(
                "تمت إضافة الطالب بنجاح ✅"
            );
        }


        // حفظ البيانات
        localStorage.setItem(
            "students",
            JSON.stringify(students)
        );


        // تفريغ الفورم
        studentForm.reset();


        // تحديث الجدول
        displayStudents();

    }
);


// ===============================
// تعديل طالب
// ===============================

function editStudent(password) {

    const student =
        students.find(
            function(item) {

                return item.password === password;

            }
        );


    if (!student) {
        return;
    }


    nameInput.value =
        student.name;

    passwordInput.value =
        student.password;

    monthInput.value =
        student.month;

    gradeInput.value =
        student.grade;

    attendanceInput.value =
        student.attendance;

    paymentInput.value =
        student.payment;


    editingPassword =
        student.password;


    saveBtn.textContent =
        "حفظ التعديل";


    cancelBtn.style.display =
        "block";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ===============================
// إلغاء التعديل
// ===============================

cancelBtn.addEventListener(
    "click",
    function() {

        editingPassword = null;

        studentForm.reset();

        saveBtn.textContent =
            "إضافة الطالب";

        cancelBtn.style.display =
            "none";

    }
);


// ===============================
// حذف طالب
// ===============================

function deleteStudent(password) {

    const confirmDelete =
        confirm(
            "هل تريد حذف هذا الطالب؟"
        );


    if (!confirmDelete) {
        return;
    }


    students =
        students.filter(
            function(student) {

                return student.password !== password;

            }
        );


    localStorage.setItem(
        "students",
        JSON.stringify(students)
    );


    displayStudents();


    showMessage(
        "تم حذف الطالب بنجاح ✅"
    );
}


// ===============================
// البحث عن طالب
// ===============================

searchStudent.addEventListener(
    "input",
    function() {

        const search =
            searchStudent.value
                .trim()
                .toLowerCase();


        const filtered =
            students.filter(
                function(student) {

                    return (

                        student.name
                            .toLowerCase()
                            .includes(search)

                        ||

                        student.password
                            .toLowerCase()
                            .includes(search)

                    );

                }
            );


        displayStudents(filtered);

    }
);


// ===============================
// الرسائل
// ===============================

function showMessage(message) {

    adminMessage.textContent =
        message;


    setTimeout(
        function() {

            adminMessage.textContent = "";

        },
        3000
    );
}


// ===============================
// تشغيل الصفحة
// ===============================

displayStudents();