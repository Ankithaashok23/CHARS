async function submitComplaint(body) {
  // ensure user is set from auth
  const user = JSON.parse(localStorage.getItem('chars_user_obj') || 'null');
  if (user && user.username) body.user = user.name || user.username;
  const resp = await fetch('/api/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return resp.json();
}

async function login(username, password){
  const resp = await fetch('/api/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
  if (!resp.ok) throw new Error((await resp.json()).message || 'login failed');
  return resp.json();
}

async function listComplaints(user){
  const url = user ? `/api/complaints?user=${encodeURIComponent(user)}` : '/api/complaints';
  const resp = await fetch(url);
  return resp.json();
}

async function vote(id) {
  const resp = await fetch(`/api/complaints/${id}/vote`, { method: 'POST' });
  const c = await resp.json();
  // reload lists on page
  if (typeof loadComplaints === 'function') loadComplaints();
  return c;
}

async function resolveTop(){
  const resp = await fetch('/api/complaints/resolve', { method: 'POST' });
  return resp.json();
}

async function withdraw(id){
  const resp = await fetch(`/api/complaints/${id}/withdraw`, { method: 'POST' });
  return resp.json();
}

async function undoWithdraw(){
  const resp = await fetch('/api/complaints/undo', { method: 'POST' });
  return resp.json();
}

// Admin / Technician API helpers
async function fetchNotifications(role, name){
  const q = role ? `?role=${encodeURIComponent(role)}${name?`&name=${encodeURIComponent(name)}`:''}` : '';
  const resp = await fetch(`/api/notifications${q}`);
  return resp.json();
}

async function assignComplaint(id, technician){
  const resp = await fetch(`/api/complaints/${id}/assign`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ technician }) });
  return resp.json();
}

async function markResolved(id){
  const resp = await fetch(`/api/complaints/${id}/markResolved`, { method: 'POST' });
  return resp.json();
}

async function listAssigned(technician){
  const resp = await fetch(`/api/complaints?assignedTo=${encodeURIComponent(technician)}`);
  return resp.json();
}

// get technicians
async function getTechnicians(){
  const resp = await fetch('/api/technicians');
  return resp.json();
}

// expose some helpers to global window for legacy inline handlers
window.login = login;
window.markResolved = markResolved;
window.fetchNotifications = fetchNotifications;
window.getTechnicians = getTechnicians;
window.assignComplaint = assignComplaint;
