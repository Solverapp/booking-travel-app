import { Commet } from "react-loading-indicators";
import { useTheme } from "../../context/useTheme";
import "./style.css";


const Loader = ({ color }) => {
    const { resolvedTheme } = useTheme();
    const resolvedColor =
        color || (resolvedTheme === "dark" ? "#3A86FF" : "#157A6F");

    return ( 
        <div className="loader-box">
            <Commet  color={resolvedColor} size="medium"  />
        </div>
        
     );
}
 
export default Loader;