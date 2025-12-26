const role = document.getElementById("role");
const studentDiv = document.getElementById("studentType");

if (role) {
  role.addEventListener("change", () => {
    studentDiv.classList.toggle("hidden", role.value !== "student");
  });
}

async function login(){
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const r = role.value;
  const t = document.getElementById("type")?.value;
  if(!username || !password || !r) return alert('Enter username, password and role');
  try{
    const user = await loginRequest(username, password);
    if(user.role !== r) return alert('Role mismatch for this user');
    localStorage.setItem('chars_user_obj', JSON.stringify(user));
    // redirect
    if (r === "student") location.href = t === "day" ? "student_dayscholar.html" : "student_hosteler.html";
    else if (r === "admin") location.href = "admin.html";
    else if (r === "technician") location.href = "technician.html";
  }catch(e){ alert('Login failed: ' + e.message) }
}

// helper used by submit to call backend login
function loginRequest(username, password){
  return window.login(username,password);
}
