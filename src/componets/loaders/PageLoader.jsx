import Loader from "./loading";
import "./style.css";

const PageLoader = ({ text = "Please wait", embedded = false }) => {
    const block = (
        <div className="loader-not">
            <Loader />
            <span>{text}</span>
        </div>
    );

    if (embedded) return block;

    return (
        <div className="maincontent">
            <div className="hcontainer">
                {block}
            </div>
        </div>
    );
};

export default PageLoader;
