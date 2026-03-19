import React, { useState } from 'react';

const paymentMethodsData = [
  { id: 1, name: 'Credit Card' },
  { id: 2, name: 'Debit Card' },
  { id: 3, name: 'PayPal' },
];

const FormasPagamento = () => {
  const [paymentMethods, setPaymentMethods] = useState(paymentMethodsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState(null);

  const handleDelete = (id) => {
    setPaymentMethods(paymentMethods.filter(method => method.id !== id));
  };

  const handleEdit = (method) => {
    setCurrentPaymentMethod(method);
    setModalVisible(true);
  };

  const handleSubmit = (newMethod) => {
    if (currentPaymentMethod) {
      setPaymentMethods(paymentMethods.map(method => (method.id === newMethod.id ? newMethod : method)));
    } else {
      setPaymentMethods([...paymentMethods, { id: paymentMethods.length + 1, ...newMethod }]);
    }
    setModalVisible(false);
    setCurrentPaymentMethod(null);
  };

  const filteredMethods = paymentMethods.filter(method => 
    method.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h1>Payment Methods</h1>
      <input 
        type="text" 
        placeholder="Search payment methods..." 
        value={searchTerm} 
        onChange={(e) => setSearchTerm(e.target.value)} 
      />
      <button onClick={() => setModalVisible(true)}>
        Add Payment Method
      </button>
      <ul>
        {filteredMethods.map(method => (
          <li key={method.id}>
            {method.name}
            <button onClick={() => handleEdit(method)}>Edit</button>
            <button onClick={() => handleDelete(method.id)}>Delete</button>
          </li>
        ))}
      </ul>
      {modalVisible && (
        <Modal 
          onClose={() => setModalVisible(false)} 
          onSubmit={handleSubmit} 
          currentMethod={currentPaymentMethod} 
        />
      )}
    </div>
  );
};

const Modal = ({ onClose, onSubmit, currentMethod }) => {
  const [name, setName] = useState(currentMethod ? currentMethod.name : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ id: currentMethod ? currentMethod.id : undefined, name });
  };

  return (
    <div className="modal">
      <h2>{currentMethod ? 'Edit' : 'Add'} Payment Method</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required
        />
        <button type="submit">Submit</button>
      </form>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};

export default FormasPagamento;