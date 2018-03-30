import React from 'react';
import StructuredQuery from '../../src';

const ExampleTable = ({data, onTokenAdd, onTokenRemove}) => (
	<div className="container my-4">
		<StructuredQuery
			stringOperations={['==', '!=', 'left', 'right', 'like']}
			options={[
				{
					id: 'name',
					category: 'Name',
					type: 'string'
				},
				{
					id: 'address',
					category: 'Address',
					type: 'string'
				},
				{
					id: 'balance',
					category: 'Balance',
					type: 'string'
				},
				{
					id: 'age',
					category: 'Age',
					type: 'integer'
				},
				{
					id: 'phone',
					category: 'Phone Number',
					type: 'string'
				},
				{
					id: 'gender',
					category: 'Gender',
					type: 'enumoptions',
					options: ['male', 'female']
				},
				{
					id: 'registered',
					category: 'Register Date',
					type: 'datetime'
				}
			]}
			onTokenAdd={onTokenAdd}
			onTokenRemove={onTokenRemove}
		/>
		<table className="table table-striped mt-sm-4">
			<thead>
				<tr>
					<th>Name</th>
					<th>Address</th>
					<th>Balance</th>
					<th>Age</th>
					<th>Phone</th>
					<th>Gender</th>
					<th>Registered</th>
				</tr>
			</thead>
			<tbody>
			{ data.map((d, i) => (
				<tr key={i}>
					<td>{d.name}</td>
					<td>{d.address}</td>
					<td>{d.balance}</td>
					<td>{d.age}</td>
					<td>{d.phone}</td>
					<td>{d.gender}</td>
					<td>{d.registered}</td>
				</tr>
			))}
			</tbody>
		</table>
	</div>
);

export default ExampleTable;
