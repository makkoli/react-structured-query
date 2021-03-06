import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import '../../node_modules/font-awesome/css/font-awesome.min.css';

import Typeahead from '../typeahead/typeahead';
import Token from './token';
import KeyEvent from '../keyevent/keyevent';

// operations for strings
const STRING_OPERATIONS = ['==', '!=', 'contains', '!contains', 'like', '!like',
      			'startsWith', '!startsWith', 'endsWith', '!endsWith'];
// operations for integers and dates
const NUM_DATE_OPERATIONS = ['==', '!=', '<', '<=', '>', '>='];
// operations for enumerable options
const ENUM_OPERATIONS = ['==', '!='];

// A typeahead that, when an option is selected replaces the text entry
// widget with a renderable 'token' that can be deleted by pressing
// backspace on the beginning of the line
class Tokenizer extends Component {

	static defaultProps = {
		// options is an array of objects with fields of
		// id, category, type
		options: [],
		customClasses: {},
		initTokens: [],
		disabled: false,
		enableQueryOnClick: false,
		exportSearch: null,
		stringOperations: STRING_OPERATIONS,
		numOperations: NUM_DATE_OPERATIONS,
		dateOperations: NUM_DATE_OPERATIONS,
		enumOperations: ENUM_OPERATIONS
	}

	static propTypes = {
		disabled: PropTypes.bool,
		enableQueryOnClick: PropTypes.bool,
		exportSearch: PropTypes.func,
		options: PropTypes.arrayOf(PropTypes.object),
		customClasses: PropTypes.object,
		onTokenRemove: PropTypes.func,
		onTokenAdd: PropTypes.func,
		initTokens: PropTypes.arrayOf(PropTypes.object),
		stringOperations: PropTypes.arrayOf(PropTypes.string),
		numOperations: PropTypes.arrayOf(PropTypes.string),
		dateOperations: PropTypes.arrayOf(PropTypes.string),
		enumOperations: PropTypes.arrayOf(PropTypes.string)
	}

	constructor(props) {
		super(props);

		// @disabled: turn structured query off but used to displays tokens
		// @focused: true when typeahead input is focused; false otherwise
		// @searchTokens - holds all user generated tokens to search with
		// 	Ex: [{category: 'id', operator: '=', value: '123'}, ...]
		// @nextToken - holds the next token to be added to the search 
		// 		tokens which are used for filtering -- 
		// 		contains:
		// 			@id - id for back end retrieval
		// 			@category - which field to search in
		//	 		@operator - the operator to apply to the field
		//	 		@value - the value to search for
		this.state = {
			disabled: this.props.disabled,
			focused: false,
			searchTokens: this.props.initTokens,
			nextToken: {
				id: '',
				category: '',
				operator: '',
				value: ''
			}
		};
	}

	componentWillReceiveProps(nextProps) {
		const { searchTokens } = this.state;

		if (this.props.initTokens !== nextProps.initTokens) {
			this.setState({ searchTokens: nextProps.initTokens });
		}
	}

	// Get the options available based on where the user is in the query
	_getOptionsForTypeahead() {
		if (this.state.nextToken.category === '') {
			let categories = this.props.options.map(option => {
				return option.category;
			});

			return categories;
		} else if (this.state.nextToken.operator === '') {
			let categoryType = this._getCategoryType();

			switch (categoryType) {
				case 'string':
				case 'email':
					return this.props.stringOperations;
				case 'enumoptions':
				case 'boolean':
					return this.props.enumOperations;
				case 'integer':
				case 'float':
					return this.props.numOperations;
				case 'datetime':
					return this.props.dateOperations;
				default:
					return [];
			}
		} else {
			let options = this._getCategoryOptions();

			if (options === undefined) {
				return [];
			} else {
				return options;
			}
		}

		return this.props.options;
	}


	// Get the data type of a category
	_getCategoryType() {
		let categorySelected = this.props.options.find(option => {
			return option.id === this.state.nextToken.id;
		});

		return categorySelected.type;
	}


	// Get the available options(enum) if any were passed in with the 
	// options object
	_getCategoryOptions() {
		let categorySelected = this.props.options.find(option => {
			return option.id === this.state.nextToken.id;
		});

		let options = categorySelected.options;

		// default case for boolean data types
		if (categorySelected.type === 'boolean' && !options) {
			return ['True', 'False'];
		}

		return options;
	}



	// Show a header for the users current selectable item
	_getHeader() {
		if (this.state.nextToken.category === '') {
			return 'Category';
		} else if (this.state.nextToken.operator === '') {
			return 'Operator';
		} else {
			return 'Value';
		}
	}

	// Get the input data type after a user selects a category
	// Used to render possible operations on that data
	// Renders to string if category and operator have been selected
	_getInputDatatype() {
		if (this.state.nextToken.category !== '' &&
			this.state.nextToken.operator !== '') {
			return this._getCategoryType();
		}

		return 'string';
	}


	// Handle removing a token from the input box when user hits backspace
	_onKeyDown = (event, value) => {
		// only care about backspaces
		if (event.keyCode !== KeyEvent.DOM_VK_BACK_SPACE || value) {
			return;
		}

		// remove part of a new token
		if (this.state.nextToken.operator !== '') {
			this.setState({
				nextToken: Object.assign({},
						this.state.nextToken,
						{
							operator: '',
							value: ''
				})
			});
		} else if (this.state.nextToken.category !== '') {
			this.setState({
				nextToken: {
					id: '',
					category: '',
					operator: '',
					value: ''
				}
			});
		// else we remove a token from the search tokens
		} else {
			const token = this.getLastInsertedToken();

			// no search tokens
			if (!token) return;

			this._removeTokenForValue(token);
		}
	}

	// get the count of search tokens for all non hidden tokens
	getSearchTokenCount = () => {
		let count = 0;

		this.state.searchTokens.forEach(token => {
			if (!token.hidden) {
				count++;
			}
		});

		return count;
	}

	// get the last inserted search token; return null if there is no last
	// inserted search token
	getLastInsertedToken = () => {
		const { searchTokens } = this.state;

		for (let i = searchTokens.length - 1; i >= 0; i--) {
			if (!searchTokens[i].hidden) {
				return searchTokens[i];
			}
		}

		return null;
	}

	// Add a token to the users current query
	// One of three things can happen when a user selects something
	// 
	// 1. The category is selected so add category name to the typeahead component
	// 2. The operator is selected so add an operator to the typeahead component
	// 3. The value has been added so add a token to the searchTokens, retrieve
	// 	the new data from the backend, and re-render
	//
	// @value: value to add to the token
	_addTokenForValue = (value) => {
		// Handle attaching a category to input
		if (this.state.nextToken.category === '') {
			this._addCategoryToNewToken(value);

			return;
		}

		// Handle attaching an operator
		if (this.state.nextToken.operator === '') {
			this._addOperatorToNewToken(value);

			return;
		}

		// Else, we are attaching a value so we need to add the 
		// next token to the list of all tokens
		// We check first to make sure there are no duplicates
		if (!this._checkDuplicateToken(value)) {
			this._addValueToNewToken(value);
		}

		return;
	}
	
	// Add a category to the new token
	_addCategoryToNewToken(value) {
		let tokenId = this.props.options.find(option => {
			return option.category === value;
		}).id;

		const newToken = Object.assign({},
				this.state.nextToken,
				{ id: tokenId, category: value, });

		this.setState({
			nextToken: newToken
		});
	}

	// Add an operator to the new token
	_addOperatorToNewToken(value) {
		const newToken = Object.assign({},
				this.state.nextToken,
				{ operator: value });

		this.setState({
			nextToken: newToken,
		});
	}

	// Add a new value to the new token and add to
	// all search tokens
	_addValueToNewToken(value) {
		const { onTokenAdd } = this.props;
		const addSearchToken = Object.assign({},
					this.state.nextToken,
					{ value });

		this.setState({
			searchTokens: this.state.searchTokens.concat(addSearchToken)
		}, () => {
			if (typeof onTokenAdd === 'function') {
				onTokenAdd(this.state.searchTokens);
			}
		});
	
		// Reset state for next token
		this.setState({
			nextToken: {
				id: '',
				category: '',
				operator: '',
				value: ''
			}
		});

	}

	// Check the next token against the current tokens for duplicates
	_checkDuplicateToken(value) {
		return this.state.searchTokens.some(token => {
			return token.category === this.state.nextToken.category &&
				token.operator === this.state.nextToken.operator &&
				token.value === value;
		}, this);
	}

	// Render all currently stored token and any incomplete tokens being 
	// constructed
	_renderTokens() {
		// add all currently applied search tokens if they exist
		return this.state.searchTokens.map(token => {

			if (token.hidden) return null;

			let tokenKey = token.category + token.operator + token.value;

			return (
				<Token
					key={tokenKey}
					onClick={this._disableToken}
					onRemove={this._removeTokenForValue}
				>
					{token}
				</Token>
		       );
		});
	}

	_disableToken = (token) => {
		const { onTokenAdd, onTokenRemove } = this.props;
		if (this.state.disabled) return;

		let index = this.state.searchTokens.indexOf(token);

		if (index === -1) return;

		let disabled;

		const disableToken = this.state.searchTokens.map((token, i) => {
			if (index === i) {
				disabled = !token.disabled;

				return Object.assign({},
					token, { disabled });
			}

			return token;
		});

		this.setState({
			focused: false,
			searchTokens: disableToken
		}, () => {
			const tokens = this.state.searchTokens.filter(token => {
				return token.disabled !== true;
			});

			if (disabled) {
				if (typeof onTokenRemove === 'function') {
					onTokenRemove(tokens);
				}
			} else {
				if (typeof onTokenAdd === 'function') {
					onTokenAdd(tokens);
				}
			}
		});	
	}

	// Remove a token from the search tokens
	_removeTokenForValue = (value) => {
		const { onTokenRemove } = this.props;
		// dont allow removal of tokens if querying is disabled
		if (this.state.disabled) {
			return;
		}

		const index = this.state.searchTokens.indexOf(value);

		// return nothing if object not found
		if (index === -1) return;

		const removeToken = this.state.searchTokens.filter((token, i) => {
			return index !== i;
		});

		this.setState({
			focused: false,
			searchTokens: removeToken
		}, () => {
			if (typeof onTokenRemove === 'function') {
				onTokenRemove(this.state.searchTokens.filter(token => {
					return token.disabled !== true;
				}));
			}
		});
	}

	enableQueryClick = () => {
		if (this.props.disabled && this.props.enableQueryOnClick) {
			this.setState({
				disabled: false
			});
		}
	}

	exportSearch = (exportData) => {
		if (typeof this.props.exportSearch === 'function') {
			const { searchTokens } = this.state;

			this.props.exportSearch(searchTokens);
		}
	}

	clearSearch = () => {
		const { onTokenRemove } = this.props;

		this.setState({
			focused: false,
			searchTokens: []
		}, () => {
			if (typeof onTokenRemove === 'function') {
				this.props.onTokenRemove(this.state.searchTokens);
			}
		});
	}

	_focusTypeahead = () => {
		this.setState({ focused: true });
	}

	render() {
		const { customClasses, exportSearch } = this.props;
		const { searchTokens } = this.state;

		const filterClasses = classNames({
			'filter-tokenizer': true,
			'filter-disabled': this.state.disabled,
			[customClasses.container]: !!customClasses.container
		});

		const searchWrapperClasses = classNames(
			'input-group-addon left-addon',
			{ 'cursor-pointer': exportSearch !== null }
		);

		const searchClasses = classNames({
			'fa': true,
			'fa-search': exportSearch === null,
			'fa-save': exportSearch !== null
		});

		return (
			<div
				className={filterClasses}
				onClick={this.enableQueryClick}
			>
				<span
					className={searchWrapperClasses}
					onClick={this.exportSearch}
				>
					<i className={searchClasses} />
				</span>
				<div
					className="token-collection"
					onClick={this._focusTypeahead}
				>
					{this._renderTokens()}
					<div className="filter-input-group">
						<div className="filter-category">
							{this.state.nextToken.category}
						</div>
						<div className="filter-operator">
							{this.state.nextToken.operator}
						</div>
						<Typeahead
							addTokenForValue={this._addTokenForValue}
							customClasses={this.props.customClasses}
							datatype={this._getInputDatatype()}
							disabled={this.state.disabled}
							focused={this.state.focused}
							header={this._getHeader()}
							onKeyDown={this._onKeyDown}
							options={this._getOptionsForTypeahead()}
						/>
					</div>
				</div>
				{ this.getSearchTokenCount() > 0 && 
					<span
						className="input-group-addon right-addon cursor-pointer"
						onClick={this.clearSearch}
					>
						<i className="fa fa-times" />
					</span>
				}
			</div>
		);
	}
}

export default Tokenizer;
