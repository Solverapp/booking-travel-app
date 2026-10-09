import { Navigate } from 'react-router-dom';
import { Button, Result } from 'antd';

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

const Successfully = ({title, subTitle, label}) => {
    return ( <div className="hconteiner">
            <div className="status-box"> 
                        <Result
                         status="success"
                         title={title}
                         subTitle={subTitle}
                         styles={stylesFn}
                         classNames={classNamesFn}
                         extra={<Button>{label}</Button>}
                       />
                        
                      </div>
          </div> );
}
 
export default Successfully;