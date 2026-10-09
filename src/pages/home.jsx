import NavBar from "../componets/navbar/Nav";
import Search from "../componets/search/Search";

const Home = () => {
    return (
      <div className="container">
        <NavBar />
        <div className="section">
          <h1 className="H1_big">Plan, book, enjoy</h1>
          
        </div>
        <Search/>
        
      </div>
    );
}
 
export default Home;