import NavBar from "../componets/navbar/Nav";
import Search from "../componets/search/Search";

const Home = () => {
    return (
      <div className="container">
        <NavBar />
        <div className="section">
          <h1 className="H1_big">One Travel Platform</h1>
          <h2 >Discover Your Dream Destination with Us</h2>
          
        </div>
        <Search/>
        
      </div>
    );
}
 
export default Home;