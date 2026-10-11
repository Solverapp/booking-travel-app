import { useState } from "react";
import { useAuth } from "../../../context/AuthContext"; // Шаг назад в папку context
import { useNavigate, NavLink } from "react-router-dom";
import Loader from "../../loaders/loading"; // Подключаем твой лоадер
import "./style.css";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Стейт для лоадера

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true); // Включаем лоадер
    
    try {
      await login(email, password);
      // Небольшая искусственная задержка на 800мс, чтобы пользователь 
      // успел увидеть красивый лоадер, а не резкий скачок экрана
      setTimeout(() => {
        navigate('/profile');
      }, 800);
    } catch (err) {
      setLoading(false); // Выключаем лоадер, если ошибка
      // Переводим стандартные ошибки Supabase на понятный язык
      if (err.message === "Invalid login credentials") {
        setError("Неверный Email или пароль. Пожалуйста, проверьте данные.");
      } else {
        setError(err.message || 'Произошла ошибка при входе');
      }
    }
  };

  return ( 
    <div className="mains">
      <div className="authcontainer">
        <div className="autpage">
          <div className="login-wrapper">
            <div className="login-card">
              <div className="glow-blob blob-1" />
              <div className="glow-blob blob-2" />
              <div className="dark-overlay" />
              <div className="view-container">
                
                {/* Если идет загрузка — показываем лоадер */}
                {loading ? (
                  <div className="form-view" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                    <Loader />
                    <p className="subtitle" style={{ marginTop: '15px' }}>Checking credentials, please wait...</p>
                  </div>
                ) : (
                  /* Если загрузки нет — показываем стандартную форму */
                  <div className="form-view">
                    <div className="header">
                      <div className="decorative-dot" />
                      <div className="titlee">Welcome Back</div>
                      <p className="subtitle">Please enter your details to sign in.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                      <div className="input-group">
                        <input 
                          type="email" 
                          className="input-field" 
                          value={email} 
                          onChange={e => setEmail(e.target.value)} 
                          placeholder="Email address" 
                          required 
                        />
                      </div>
                      <div className="input-group">
                        <input 
                          type="password" 
                          className="input-field" 
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          placeholder="Password" 
                          required 
                        />
                      </div>

                      {/* КРАСИВЫЙ ВЫВОД ОШИБКИ ИНТЕРФЕЙСА */}
                      {error && (
                        <div className="error-message-block" style={{ color: '#ff4d4f', fontSize: '14px', marginBottom: '15px', backgroundColor: 'rgba(255, 77, 79, 0.1)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 77, 79, 0.2)' }}>
                          {error}
                        </div>
                      )}

                      <a href="#" className="forgot-link">Forgot password?</a>
                      <button type="submit" className="btn-submit">Sign In</button>
                    </form>

                    <NavLink to={"/register"}> 
                      <div className="signup-prompt">
                        Don't have an account?
                        <label className="toggle-link">Sign up</label>
                      </div>
                    </NavLink>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
 
export default Login;
