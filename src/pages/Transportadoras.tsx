import React from 'react';
import { Table, Input, Button } from 'antd';

const Transportadoras = () => {
  const [searchText, setSearchText] = React.useState('');
  const [data, setData] = React.useState([]);

  const handleSearch = (value) => {
    setSearchText(value);
  };

  // Sample data fetching function, replace with actual data fetching logic
  const fetchData = () => {
    // Fetch data from API or state management
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      <h1>Transportadoras (Carriers)</h1>
      <Input.Search
        placeholder='Search Transportadoras'
        onSearch={handleSearch}
        style={{ marginBottom: '20px' }}
      />
      <Button type='primary' style={{ marginBottom: '20px' }}>Add New</Button>
      <Table dataSource={filteredData} rowKey='id'>
        <Column title='ID' dataIndex='id' />
        <Column title='Name' dataIndex='name' />
        <Column title='Actions' render={(text, record) => (
          <span>
            <Button>Edit</Button>
            <Button type='danger'>Delete</Button>
          </span>
        )} />
      </Table>
    </div>
  );
};

export default Transportadoras;
