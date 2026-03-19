import React from 'react';

const CotacoesCompra = () => {
    const quotations = [
        { number: '001', supplier: 'Supplier A', issueDate: '2026-03-01', dueDate: '2026-03-10', items: 5, totalValue: '100.00', status: 'Open' },
        { number: '002', supplier: 'Supplier B', issueDate: '2026-03-05', dueDate: '2026-03-15', items: 3, totalValue: '200.00', status: 'Closed' }
    ];

    return (
        <div>
            <h1>Purchase Quotations</h1>
            <table>
                <thead>
                    <tr>
                        <th>Quote Number</th>
                        <th>Supplier</th>
                        <th>Issue Date</th>
                        <th>Due Date</th>
                        <th>Number of Items</th>
                        <th>Total Value</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {quotations.map((quote) => (
                        <tr key={quote.number}>
                            <td>{quote.number}</td>
                            <td>{quote.supplier}</td>
                            <td>{quote.issueDate}</td>
                            <td>{quote.dueDate}</td>
                            <td>{quote.items}</td>
                            <td>{quote.totalValue}</td>
                            <td>{quote.status}</td>
                            <td>
                                <button>Edit</button>
                                <button>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CotacoesCompra;