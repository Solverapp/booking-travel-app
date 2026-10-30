import { Navigate, useSearchParams } from "react-router-dom";
import NavBar from "../componets/navbardark/Nav";
import Tour from "../componets/tours/Tournew";
import defaultdates from "../utils/defaultdates";
import { DEFAULT_TOUR_CITY } from "../mock/searchDestinations";

const Tours = () => {
    const [searchParams] = useSearchParams();

    if (
        !searchParams.get("city") ||
        !searchParams.get("checkIn") ||
        !searchParams.get("adults") ||
        !searchParams.get("children") ||
        !searchParams.get("infants")
    ) {
        const params = new URLSearchParams(searchParams);
        if (!params.get("city")) params.set("city", DEFAULT_TOUR_CITY);
        if (!params.get("checkIn")) params.set("checkIn", defaultdates.tomorrow);
        if (!params.get("adults")) params.set("adults", "1");
        if (!params.get("children")) params.set("children", "0");
        if (!params.get("infants")) params.set("infants", "0");

        return <Navigate to={`/tours?${params.toString()}`} replace />;
    }

    return ( <div className="hconteiner">
        <NavBar/>
        
        <Tour/>
    </div> );
}
 
export default Tours;