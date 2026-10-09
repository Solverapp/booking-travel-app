import { Button, Result } from 'antd';
import {  useNavigate } from 'react-router-dom';


const classNamesFn = info => {
  if (info.props.status === 'success') {
    return {
      root: 'demo-result-root--success',
    };
  }
  return {
    root: 'demo-result-root--default',
  };
};
const stylesObject = {
  root: { borderWidth: 2, borderStyle: 'dashed', padding: 16 },
  title: { fontStyle: 'italic', color: '#1890ff' },
  subTitle: { fontWeight: 'bold' },
  icon: { opacity: 0.8 },
  extra: { backgroundColor: '#11253c', padding: 8 },
  body: { backgroundColor: '#fafafa', padding: 12 },
};
const stylesFn = info => {
  if (info.props.status === 'error') {
    return {
      root: { backgroundColor: 'var(--bg)', borderColor: '#ff4d4f' },
      title: { color: '#ff4d4f' },
    };
  } else {
    return {
      root: { backgroundColor: '#f6ffed', borderColor: '#52c41a' },
      title: { color: '#52c41a' },
    };
  }
};

const Errorsfully = ({title, subTitle, label}) => {
  const navigate = useNavigate();
  const handleBack = () => {
  navigate("/");
   };
    return ( <div className="hconteiner">
            <div className="status-box"> 
                        <Result
                         status="error"
                         title={title}
                         subTitle={subTitle}
                         styles={stylesFn}
                         classNames={classNamesFn}
                         extra={<Button onClick={handleBack}>{label}</Button>}
                       />
                        
                      </div>
          </div> );
}
 
export default Errorsfully;