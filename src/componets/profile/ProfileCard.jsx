import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import NavBar from "./NavBar";
import "./style.css";

export const ProfileCard = () => {
  const { user, logout, orders } = useAuth();
  const [userOrders, setUserOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("profile");
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    console.log(tab);
    
    
  };
useEffect(() => {
    if (!user?.uid) return;

    orders(user.uid)
  .then((result) => setUserOrders(Array.isArray(result) ? result : []))
  .catch((error) => console.error('Не удалось загрузить ордера:', error));
  }, [user?.uid, orders]);


  // Если пользователя почему-то нет, не ломаем приложение
  if (!user) return <p>Пользователь не найден</p>;

  return (
    <div className="pcontainer">
      <NavBar onTabChange = {handleTabChange}/>
      <div className="profile-box">
        <div className={`tab-content ${activeTab === "profile" ? "" : "hiden"}`}>
          <div className="tab-content-box">
            <h1>Profile detalis</h1>
            <div className="tab-info-box">
              <div className="tab-item">
                <p> <strong>Name:</strong> {user.firstname || "Не указано"} </p>
              </div>
              <div className="tab-item">
                <p> <strong>Surname:</strong> {user.lastname || "Не указано"} </p>
              </div>
              <div className="tab-item">
                <p> <strong>Email:</strong> {user.email} </p>
              </div>
              <div className="tab-item">
                <p> <strong>ID-Bubble:</strong> {user.uid} </p>
              </div>
            </div>
          </div>

        </div>
        <div className={`tab-content ${activeTab === "book" ? "" : "hiden"}`}>
          <div className="tab-content-box">
            <h1>My Bookings</h1>
            <div className="tab-info-box">
              {userOrders.map((item) => (
  <div className="tab-item" key={item.id}>
    <p><strong>Service name</strong>: {item.name}</p>
    <p><strong>Total</strong>: {item.sum}</p>
    <p><strong>Service type</strong>: {item.Service}</p>
    <p><strong>Status</strong>: {item.status}</p>
  </div>
))}
              
            </div>
          </div>

        </div>
        
      </div>
    </div>
    
  );
};
