import { useParams } from "react-router-dom";
import Nav from "../componets/navbardark/Nav"

import Hotel from "../componets/hotels/hotelpage/HotelPages";


const Hotelpage = () => {
    const id = useParams();
    const hid = toString(id)
    
    
     


    return ( 
       
        <div>
         <Nav/>
         <Hotel id={id}/>
         

        </div>
     );
}
 
export default Hotelpage;