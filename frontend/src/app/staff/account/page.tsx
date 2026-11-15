"use client";

import { useAuth } from "../../../components/auth-provider";

export default function StaffAccountPage() {
  const { user, logout } = useAuth();
  return (
    <section className="staff-page">
      <div className="staff-page-heading">
        <div><span className="section-kicker">TÀI KHOẢN</span><h1>Tài khoản nhân viên</h1></div>
      </div>
      <div className="staff-account-card">
        <span className="staff-user-avatar" aria-hidden="true">{user?.email.charAt(0).toUpperCase()}</span>
        <dl><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Vai trò</dt><dd>STAFF</dd></div></dl>
        <button className="order-cancel-button" type="button" onClick={logout}>Đăng xuất</button>
      </div>
    </section>
  );
}
