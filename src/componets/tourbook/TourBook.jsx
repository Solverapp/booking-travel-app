
import {  useNavigate } from "react-router-dom";
import {  useState } from "react";
import "./style.css";
import left from "../../img/icons/tabicons/arrow-left.svg";



const TourBook = ( { cardItem, setCardItem }) => {
   const navigate = useNavigate();
  const item = cardItem[0];
  const handleBack = () => {
  const params = new URLSearchParams({
    city: item.city,
    checkIn: item.tourDate,
    adults: item.adult,
    children: item.child,
    infants: 0,
  });
  navigate(`/tours?${params.toString()}`);
};
 
const [formData, setFormData] = useState({ firstname: '',  lastname: '', email: '', phone: '', });

const handleChange = (e) => {
    const { name, value } = e.target; // извлекаем name и value из изменённого инпута

    setFormData((prevData) => ({
      ...prevData,     // копируем всё старое состояние
      [name]: value,   // обновляем только то поле, у которого совпал name
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Отправляемые данные:', formData);
  };
console.log(cardItem);
  return (
    <div className="maincontents">
      <div className="hcontainer">
        <div className="hinfo">
          <div className="backoption">
            <button onClick={() => handleBack()}>
                        <img src={left} alt="back" />
                        <span>Back</span>
                      </button>
          </div>
          <div className="infohederpage">
            <div className="hederbox">
              
              <form onSubmit={handleSubmit} className="form">
    <p className="title">Passanger detalis</p>
    <p className="message">Enter lead passanger detalis. </p>
        <div className="flex">
        <label>
            <input name="firstname" 
            value={formData.firstname}
           onChange={handleChange} id="fn" required placeholder=" " type="text" className="input"/>
            <span>Firstname</span>
        </label>

        <label>
            <input name="lastname" 
            value={formData.lastname}
           onChange={handleChange} id="ln" required placeholder=" " type="text" className="input"/>
            <span>Lastname</span>
        </label>
    </div>  
            
    <label>
        <input name="email" 
            value={formData.email}
           onChange={handleChange} id="em" required placeholder=" " type="email" className="input"/>
        <span>Email</span>
    </label> 
        
    <label>
        <input name="phone" 
            value={formData.phone}
           onChange={handleChange} id="pn" required placeholder=" " type="text" className="input"/>
        <span>Phone</span>
    </label>
    
        
    <button className="submit">Checkout</button>
    
</form>
            </div>
            
<div className="containerchek">
  <div className="cardnew cart">
    
    <div className="steps">
      <div className="step">
        <div>
          <span>Tour type</span>
          <p>{item.tourName}</p>
        </div>
        <hr/>
        <div>
          <span>Ticket type</span>
          <p>{item.optionName}</p>
        </div>
        <hr/>
        <div>
          <span>Visit date&time</span>
          <p>{item.tourDate}, {item.tourTime}</p>
        </div>
        <hr/>
        <div>
          <span>Number of passangers</span>
          <p>{item.leadPassangers} / adult-{item.adult}, childs-{item.child}</p>
        </div>
        <hr/>
        
      
        <div className="payments">
          <span>PAYMENT</span>
          <div className="details">
            <span>Subtotal:</span>
            <span>AED{item.b2cTotal}</span>
            
            <span>Tax:</span>
            <span>AED0.00</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div className="cardnew checkout">
    <div className="footer">
      <label className="price">AED{item.b2cTotal}</label>
      {/* <button className="checkout-btn">Checkout</button> */}
    </div>
  </div>
</div>
          </div>
        </div>
      </div>
    </div>
    
  );
};

export default TourBook;

