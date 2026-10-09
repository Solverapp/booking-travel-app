import { useState } from "react";
import { useAuth } from "../../context/AuthContext"; // Шаг назад в папку context
import { useNavigate } from "react-router-dom";
import "./style.css";

export const RegisterForm = () => {
  const { register } = useAuth(); // Забираем метод регистрации
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Вызываем метод, он сам отправит запрос в Bubble и сохранит юзера
      await register(email, password, firstName, lastName);
      navigate("/profile"); // Перенаправляем в личный кабинет
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="mains">
      <div className="authcontainer">
        <div className="autpage">
          <form className="form" onSubmit={handleSubmit}>
      
      <p className="title">Register </p>
    <p className="message">Signup now and get full access to our app. </p>
        <div className="flex">
        <label>
            <input value={firstName}
        onChange={(e) => setFirstName(e.target.value)} required="" placeholder="" type="text" className="input"/>
            <span>Firstname</span>
        </label>

        <label>
            <input value={lastName}
        onChange={(e) => setLastName(e.target.value)} required="" placeholder="" type="text" className="input"/>
            <span>Lastname</span>
        </label>
    </div>  
            
    <label>
        <input value={email}
        onChange={(e) => setEmail(e.target.value)} required="" placeholder="" type="email" className="input"/>
        <span>Email</span>
    </label> 
        
    <label>
        <input
        value={password}
        onChange={(e) => setPassword(e.target.value)} required="" placeholder="" type="password" className="input"/>
        <span>Password</span>
    </label>
    
    <button type="submit" className="submit">Signup</button>
    <p className="signin">Already have an acount ? <a href="#">Signin</a> </p>
    </form>
        </div>
      </div>
    </div>
    
  );
};
