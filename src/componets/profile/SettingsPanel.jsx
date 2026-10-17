import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { CURRENCIES, DEFAULT_CURRENCY } from "../../utils/currency";
import "./style.css";

const SettingsMessage = ({ message }) =>
  message ? (
    <span className={`ps-message ${message.tone === "ok" ? "is-ok" : "is-error"}`}>
      {message.text}
    </span>
  ) : null;

const SettingsPanel = () => {
  const { user, updateProfile, updatePassword, updateCurrency } = useAuth();

  const [firstname, setFirstname] = useState(user?.firstname || "");
  const [lastname, setLastname] = useState(user?.lastname || "");
  const [profileState, setProfileState] = useState({ saving: false, message: null });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordState, setPasswordState] = useState({ saving: false, message: null });

  const [currency, setCurrency] = useState(user?.currency || DEFAULT_CURRENCY);
  const [currencyState, setCurrencyState] = useState({ saving: false, message: null });

  const profileChanged =
    firstname.trim() !== (user?.firstname || "") || lastname.trim() !== (user?.lastname || "");

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileState({ saving: true, message: null });
    try {
      await updateProfile({ firstname: firstname.trim(), lastname: lastname.trim() });
      setProfileState({ saving: false, message: { tone: "ok", text: "Personal details saved" } });
    } catch (err) {
      setProfileState({
        saving: false,
        message: { tone: "error", text: err.message || "Could not save changes" },
      });
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordState({
        saving: false,
        message: { tone: "error", text: "New passwords do not match" },
      });
      return;
    }

    setPasswordState({ saving: true, message: null });
    try {
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordState({ saving: false, message: { tone: "ok", text: "Password updated" } });
    } catch (err) {
      setPasswordState({
        saving: false,
        message: { tone: "error", text: err.message || "Could not update password" },
      });
    }
  };

  const handleCurrencyChange = async (e) => {
    const next = e.target.value;
    const previous = currency;
    setCurrency(next);
    setCurrencyState({ saving: true, message: null });
    try {
      await updateCurrency(next);
      setCurrencyState({
        saving: false,
        message: { tone: "ok", text: "Saved — new searches will use this currency" },
      });
    } catch (err) {
      setCurrency(previous);
      setCurrencyState({
        saving: false,
        message: { tone: "error", text: err.message || "Could not save currency" },
      });
    }
  };

  return (
    <div className="profile-panel">
      <section className="profile-card">
        <h2 className="profile-card-title">Personal details</h2>
        <form className="ps-form" onSubmit={handleProfileSave}>
          <div className="ps-grid">
            <label className="ps-field">
              <span className="ps-label">First name</span>
              <input
                className="ps-input"
                type="text"
                value={firstname}
                autoComplete="given-name"
                onChange={(e) => setFirstname(e.target.value)}
              />
            </label>

            <label className="ps-field">
              <span className="ps-label">Last name</span>
              <input
                className="ps-input"
                type="text"
                value={lastname}
                autoComplete="family-name"
                onChange={(e) => setLastname(e.target.value)}
              />
            </label>

            <label className="ps-field ps-field--full">
              <span className="ps-label">Email</span>
              <input className="ps-input" type="email" value={user?.email || ""} disabled />
              <span className="ps-hint">Email changes are not available yet</span>
            </label>
          </div>

          <div className="ps-foot">
            <button
              type="submit"
              className="ps-save"
              disabled={!profileChanged || profileState.saving}
            >
              {profileState.saving ? "Saving..." : "Save changes"}
            </button>
            <SettingsMessage message={profileState.message} />
          </div>
        </form>
      </section>

      <section className="profile-card">
        <h2 className="profile-card-title">Security</h2>
        <form className="ps-form" onSubmit={handlePasswordSave}>
          <div className="ps-grid">
            <label className="ps-field ps-field--full">
              <span className="ps-label">Current password</span>
              <input
                className="ps-input"
                type="password"
                value={currentPassword}
                autoComplete="current-password"
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </label>

            <label className="ps-field">
              <span className="ps-label">New password</span>
              <input
                className="ps-input"
                type="password"
                value={newPassword}
                autoComplete="new-password"
                minLength={6}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <span className="ps-hint">At least 6 characters</span>
            </label>

            <label className="ps-field">
              <span className="ps-label">Confirm new password</span>
              <input
                className="ps-input"
                type="password"
                value={confirmPassword}
                autoComplete="new-password"
                minLength={6}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="ps-foot">
            <button type="submit" className="ps-save" disabled={passwordState.saving}>
              {passwordState.saving ? "Updating..." : "Update password"}
            </button>
            <SettingsMessage message={passwordState.message} />
          </div>
        </form>
      </section>

      <section className="profile-card">
        <h2 className="profile-card-title">Preferences</h2>
        <div className="ps-grid">
          <label className="ps-field">
            <span className="ps-label">Currency</span>
            <select
              className="ps-input ps-select"
              value={currency}
              onChange={handleCurrencyChange}
              disabled={currencyState.saving}
            >
              {CURRENCIES.map(({ code, label }) => (
                <option key={code} value={code}>
                  {code} — {label}
                </option>
              ))}
            </select>
            <span className="ps-hint">
              Used for hotel and flight prices in new searches (falls back to AED if unsupported)
            </span>
          </label>
        </div>
        <div className="ps-foot">
          <SettingsMessage message={currencyState.message} />
        </div>
      </section>
    </div>
  );
};

export default SettingsPanel;
