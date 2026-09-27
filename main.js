const students = JSON.parse(
    localStorage.getItem("students")
) || [];


// البحث عن الطالب بكلمة المرور
function searchStudent() {

    const password =
        document.getElementById("password").value.trim();

    const error =
        document.getElementById("error");

    const studentSection =
        document.getElementById("studentSection");


    // لو كلمة المرور فاضية
    if (password === "") {

        error.textContent =
            "من فضلك أدخل كلمة المرور";

        studentSection.style.display = "none";

        return;
    }


    // البحث عن الطالب
    const student = students.find(function(student) {

        return student.password === password;

    });


    // الطالب غير موجود
    if (!student) {

        error.textContent =
            "كلمة المرور غير صحيحة ❌";

        studentSection.style.display = "none";

        return;
    }


    // مسح رسالة الخطأ
    error.textContent = "";


    // عرض بيانات الطالب
    document.getElementById("studentName").textContent =
        student.name;


    document.getElementById("studentMonth").textContent =
        student.month;


    document.getElementById("studentGrade").textContent =
        student.grade;


    document.getElementById("studentAttendance").textContent =
        student.attendance;


    document.getElementById("studentPayment").textContent =
        student.payment;
document.getElementById("studentpassword").textContent=student.password;

    // إظهار بيانات الطالب
    studentSection.style.display = "block";


    // الانتقال لبيانات الطالب
    studentSection.scrollIntoView({
        behavior: "smooth"
    });

}