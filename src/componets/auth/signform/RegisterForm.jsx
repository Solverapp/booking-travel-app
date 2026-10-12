import { useState } from "react";
import { useAuth } from "../../../context/AuthContext"; // Шаг назад в папку context
import { useNavigate, NavLink } from "react-router-dom";
import Loader from "../../loaders/loading"; // Подключаем твой лоадер
import "./style.css";

export const RegisterForm = () => {
  const { register } = useAuth(); 
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState(""); // Добавили стейт ошибки
  const [loading, setLoading] = useState(false); // Добавили стейт лоадера

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true); // Включаем загрузку
    
    try {
      await register(email, password, firstName, lastName);
      setTimeout(() => {
        navigate("/profile"); // Перенаправляем в личный кабинет
      }, 800);
    } catch (err) {
      setLoading(false); // Выключаем лоадер, чтобы пользователь мог исправить данные
      if (err.message.includes("User already registered")) {
        setError("Пользователь с таким Email уже зарегистрирован.");
      } else if (err.message.includes("Password should be at least")) {
        setError("Пароль слишком короткий (минимум 6 символов).");
      } else {
        setError(err.message || "Ошибка при регистрации. Проверьте данные.");
      }
    }
  };

  return (
    <div className="mains">
      <div className="authcontainer">
        <div className="login-wrapper">
            <div className="login-card">
              <div className="glow-blob blob-1" />
              <div className="glow-blob blob-2" />
              <div className="dark-overlay" />
              <div className="view-container">
                
                {/* Если идет загрузка — прячем форму, крутим лоадер */}
                {loading ? (
                  <div className="form-view" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
                    <Loader />
                    <p className="subtitle" style={{ marginTop: '15px' }}>Creating your account and securing profile...</p>
                  </div>
                ) : (
                  /* Обычное состояние формы */
                  <div className="form-view">
                    <div className="header">
                      <div className="decorative-dot" />
                      <div className="titlee">Create Account</div>
                      <p className="subtitle">Join us to get started.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                      <div className="input-group">
                        <input 
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)} 
                          type="text" 
                          className="input-field" 
                          placeholder="First Name" 
                          required 
                        />
                      </div>
                      <div className="input-group">
                        <input 
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)} 
                          type="text" 
                          className="input-field" 
                          placeholder="Last Name" 
                          required 
                        />
                      </div>
                      <div className="input-group">
                        <input 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)} 
                          type="email" 
                          className="input-field" 
                          placeholder="Email address" 
                          required 
                        />
                      </div>
                      <div className="input-group">
                        <input 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)} 
                          type="password" 
                          className="input-field" 
                          placeholder="Password" 
                          required 
                        />
                      </div>

                      {/* КРАСИВЫЙ ВЫВОД ОШИБКИ ИНТЕРФЕЙСА РЕГИСТРАЦИИ */}
                      {error && (
                        <div className="error-message-block" style={{ color: '#ff4d4f', fontSize: '14px', marginTop: '5px', marginBottom: '15px', backgroundColor: 'rgba(255, 77, 79, 0.1)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 77, 79, 0.2)' }}>
                          {error}
                        </div>
                      )}

                      <div style={{ height: 12 }} />
                      <button type="submit" className="btn-submit">Sign Up</button>
                    </form>

                    <NavLink to={"/login"}> 
                      <div className="signup-prompt">
                        Already have an account?
                        <label className="toggle-link">Sign in</label>
                      </div>
                    </NavLink>
                  </div>
                )}

              </div>
            </div>
          </div>
        
      </div>
    </div>
  );
};
