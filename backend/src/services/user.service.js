const bcrypt = require('bcrypt');
const userRepo = require('../repositories/user.repository');

function fail(message, status) {
  throw Object.assign(new Error(message), { status });
}

async function listUsers(query) {
  return userRepo.findAll(query);
}

async function getUser(id) {
  const user = await userRepo.findById(id);
  if (!user) fail('User not found', 404);
  return user;
}

async function createUser({ username, email, full_name, password, role }) {
  if (!username || !password) fail('username and password are required', 400);

  const existing = await userRepo.findByUsername(username);
  if (existing) fail('Username already taken', 409);

  const password_hash = await bcrypt.hash(password, 10);
  return userRepo.create({
    username,
    password_hash,
    role: role || 'VIEWER',
    email: email || null,
    full_name: full_name || null,
  });
}

async function updateUser(id, { email, full_name, role, is_active }) {
  await getUser(id);
  const data = {};
  if (email !== undefined) data.email = email;
  if (full_name !== undefined) data.full_name = full_name;
  if (role !== undefined) data.role = role;
  if (typeof is_active === 'boolean') data.is_active = is_active;
  return userRepo.update(id, data);
}

async function deleteUser(id, requestingUserId) {
  if (id === requestingUserId) fail('Cannot delete your own account', 400);
  await getUser(id);
  return userRepo.remove(id);
}

async function getProfile(id) {
  return getUser(id);
}

async function updateProfile(id, { full_name, email }) {
  const data = {};
  if (full_name !== undefined) data.full_name = full_name;
  if (email !== undefined) data.email = email;
  return userRepo.update(id, data);
}

async function updatePreferences(id, preferences) {
  return userRepo.update(id, { preferences });
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser, getProfile, updateProfile, updatePreferences };
