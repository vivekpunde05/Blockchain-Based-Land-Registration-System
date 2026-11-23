// SPDX-License-Identifier: MIT
pragma solidity >= 0.5.2;
pragma experimental ABIEncoderV2;

/**
 * @title Decentralized Land Registration System
 * @notice Capstone Final Year Project - Single User (Buyer & Seller) Architecture
 * @dev Loknete Shamrao Peje Government College of Engineering
 * @dev Department of Artificial Intelligence & Data Science
 * @author Vivek Punde (23030421995010), Aryan Mhatre (23030421995042), Rohit Dongre (23030421995006)
 */
contract Land {
    struct Landreg {
        uint id;
        uint area;
        string city;
        string state;
        uint landPrice;
        uint propertyPID;
        uint physicalSurveyNumber;
        string ipfsHash;
        string document;
    }

    struct User {
        address id;
        string name;
        uint age;
        string city;
        string aadharNumber;
        string panNumber;
        string document;
        string email;
    }

    struct Buyer {
        address id;
        string name;
        uint age;
        string city;
        string aadharNumber;
        string panNumber;
        string document;
        string email;
    }

    struct Seller {
        address id;
        string name;
        uint age;
        string aadharNumber;
        string panNumber;
        string landsOwned;
        string document;
    }

    struct LandInspector {
        uint id;
        string name;
        uint age;
        string designation;
    }

    struct LandRequest {
        uint reqId;
        address sellerId;
        address buyerId;
        uint landId;
    }

    struct TransactionRecord {
        uint txId;
        uint landId;
        address seller;
        address buyer;
        uint amount;
        uint timestamp;
    }

    // Storage Mappings
    mapping(uint => Landreg) public lands;
    mapping(uint => LandInspector) public InspectorMapping;
    mapping(address => User) public UserMapping;
    mapping(address => Seller) public SellerMapping;
    mapping(address => Buyer) public BuyerMapping;
    mapping(uint => LandRequest) public RequestsMapping;
    mapping(uint => TransactionRecord) public transactionRecords;

    // Registrations & Roles
    mapping(address => bool) public RegisteredAddressMapping;
    mapping(address => bool) public RegisteredUserMapping;
    mapping(address => bool) public RegisteredSellerMapping;
    mapping(address => bool) public RegisteredBuyerMapping;

    // User Verification / Rejection
    mapping(address => bool) public UserVerification;
    mapping(address => bool) public UserRejection;
    mapping(address => string) public UserRejectionReason;

    // Legacy verification mappings kept for Admin UI compatibility
    mapping(address => bool) public SellerVerification;
    mapping(address => bool) public SellerRejection;
    mapping(address => bool) public BuyerVerification;
    mapping(address => bool) public BuyerRejection;

    // Land Status
    mapping(uint => bool) public LandVerification;
    mapping(uint => bool) public LandRejection;
    mapping(uint => string) public LandRejectionReason;
    mapping(uint => bool) public LandOnSale;
    mapping(uint => address) public LandOwner;

    // Purchase Requests Status
    mapping(uint => bool) public RequestStatus;    // true = approved / accepted by seller
    mapping(uint => bool) public RequestRejected;  // true = rejected by seller
    mapping(uint => bool) public RequestedLands;    // true = active
    mapping(uint => bool) public PaymentReceived;

    address public Land_Inspector;
    address[] public users;
    address[] public sellers;
    address[] public buyers;

    uint public landsCount;
    uint public inspectorsCount;
    uint public usersCount;
    uint public sellersCount;
    uint public buyersCount;
    uint public requestsCount;
    uint public transactionsCount;

    // Events
    event Registration(address indexed _registrationId);
    event AddingLand(uint indexed _landId);
    event Landrequested(address indexed _sellerId, address indexed _buyerId, uint indexed _landId);
    event requestApproved(uint indexed _reqId);
    event requestRejected(uint indexed _reqId);
    event requestCancelled(uint indexed _reqId);
    event Verified(address indexed _id);
    event Rejected(address indexed _id);
    event PaymentCompleted(uint indexed landId, address indexed from, address indexed to, uint amount);
    event OwnershipTransferred(uint indexed landId, address indexed oldOwner, address indexed newOwner);

    modifier onlyInspector() {
        require(msg.sender == Land_Inspector, "Only Land Inspector permitted");
        _;
    }

    constructor() public {
        Land_Inspector = msg.sender;
        addLandInspector("Inspector 1", 45, "Tehsil Manager");
    }

    function addLandInspector(string memory _name, uint _age, string memory _designation) private {
        inspectorsCount++;
        InspectorMapping[inspectorsCount] = LandInspector(inspectorsCount, _name, _age, _designation);
    }

    // Counts
    function getLandsCount() public view returns (uint) { return landsCount; }
    function getUsersCount() public view returns (uint) { return usersCount; }
    function getBuyersCount() public view returns (uint) { return buyersCount; }
    function getSellersCount() public view returns (uint) { return sellersCount; }
    function getRequestsCount() public view returns (uint) { return requestsCount; }
    function getTransactionsCount() public view returns (uint) { return transactionsCount; }

    // Land Property Getters
    function getArea(uint i) public view returns (uint) { return lands[i].area; }
    function getCity(uint i) public view returns (string memory) { return lands[i].city; }
    function getState(uint i) public view returns (string memory) { return lands[i].state; }
    function getPrice(uint i) public view returns (uint) { return lands[i].landPrice; }
    function getPID(uint i) public view returns (uint) { return lands[i].propertyPID; }
    function getSurveyNumber(uint i) public view returns (uint) { return lands[i].physicalSurveyNumber; }
    function getImage(uint i) public view returns (string memory) { return lands[i].ipfsHash; }
    function getDocument(uint i) public view returns (string memory) { return lands[i].document; }
    function getLandOwner(uint id) public view returns (address) { return LandOwner[id]; }
    function isLandOnSale(uint id) public view returns (bool) { return LandOnSale[id]; }

    // Land Inspector Verifications
    function verifySeller(address _sellerId) public onlyInspector {
        SellerVerification[_sellerId] = true;
        UserVerification[_sellerId] = true;
        emit Verified(_sellerId);
    }

    function rejectSeller(address _sellerId) public onlyInspector {
        SellerRejection[_sellerId] = true;
        UserRejection[_sellerId] = true;
        emit Rejected(_sellerId);
    }

    function verifyBuyer(address _buyerId) public onlyInspector {
        BuyerVerification[_buyerId] = true;
        UserVerification[_buyerId] = true;
        emit Verified(_buyerId);
    }

    function rejectBuyer(address _buyerId) public onlyInspector {
        BuyerRejection[_buyerId] = true;
        UserRejection[_buyerId] = true;
        emit Rejected(_buyerId);
    }

    function verifyUser(address _userId) public onlyInspector {
        UserVerification[_userId] = true;
        SellerVerification[_userId] = true;
        BuyerVerification[_userId] = true;
        emit Verified(_userId);
    }

    function rejectUser(address _userId, string memory _reason) public onlyInspector {
        UserRejection[_userId] = true;
        SellerRejection[_userId] = true;
        BuyerRejection[_userId] = true;
        UserRejectionReason[_userId] = _reason;
        emit Rejected(_userId);
    }

    function verifyLand(uint _landId) public onlyInspector {
        LandVerification[_landId] = true;
        LandRejection[_landId] = false;
        LandOnSale[_landId] = true; // Admin verifies the land is legal and approves it for sale
    }

    function rejectLand(uint _landId, string memory _reason) public onlyInspector {
        LandRejection[_landId] = true;
        LandVerification[_landId] = false;
        LandOnSale[_landId] = false;
        LandRejectionReason[_landId] = _reason;
    }

    function isLandVerified(uint _id) public view returns (bool) {
        return LandVerification[_id];
    }

    function isLandRejected(uint _id) public view returns (bool) {
        return LandRejection[_id];
    }

    function getLandRejectionReason(uint _id) public view returns (string memory) {
        return LandRejectionReason[_id];
    }

    function isVerified(address _id) public view returns (bool) {
        return (UserVerification[_id] || SellerVerification[_id] || BuyerVerification[_id]);
    }

    function isRejected(address _id) public view returns (bool) {
        return (UserRejection[_id] || SellerRejection[_id] || BuyerRejection[_id]);
    }

    function isSeller(address _id) public view returns (bool) {
        return RegisteredAddressMapping[_id];
    }

    function isBuyer(address _id) public view returns (bool) {
        return RegisteredAddressMapping[_id];
    }

    function isUser(address _id) public view returns (bool) {
        return RegisteredAddressMapping[_id];
    }

    function isLandInspector(address _id) public view returns (bool) {
        return (Land_Inspector == _id);
    }

    function isRegistered(address _id) public view returns (bool) {
        return RegisteredAddressMapping[_id];
    }

    // Unified User Registration (Supports both Buying & Selling)
    function registerUser(
        string memory _name,
        uint _age,
        string memory _city,
        string memory _aadharNumber,
        string memory _panNumber,
        string memory _document,
        string memory _email
    ) public {
        require(!RegisteredAddressMapping[msg.sender], "User address already registered");

        RegisteredAddressMapping[msg.sender] = true;
        RegisteredUserMapping[msg.sender] = true;
        RegisteredSellerMapping[msg.sender] = true;
        RegisteredBuyerMapping[msg.sender] = true;

        usersCount++;
        UserMapping[msg.sender] = User(msg.sender, _name, _age, _city, _aadharNumber, _panNumber, _document, _email);
        users.push(msg.sender);

        // Keep mappings synchronized for Admin/Inspector backward compatibility
        sellersCount++;
        SellerMapping[msg.sender] = Seller(msg.sender, _name, _age, _aadharNumber, _panNumber, "0", _document);
        sellers.push(msg.sender);

        buyersCount++;
        BuyerMapping[msg.sender] = Buyer(msg.sender, _name, _age, _city, _aadharNumber, _panNumber, _document, _email);
        buyers.push(msg.sender);

        emit Registration(msg.sender);
    }

    // Legacy Registration Methods
    function registerSeller(string memory _name, uint _age, string memory _aadharNumber, string memory _panNumber, string memory _landsOwned, string memory _document) public {
        require(!RegisteredAddressMapping[msg.sender], "Address already registered");

        RegisteredAddressMapping[msg.sender] = true;
        RegisteredSellerMapping[msg.sender] = true;
        RegisteredBuyerMapping[msg.sender] = true;
        RegisteredUserMapping[msg.sender] = true;

        sellersCount++;
        SellerMapping[msg.sender] = Seller(msg.sender, _name, _age, _aadharNumber, _panNumber, _landsOwned, _document);
        sellers.push(msg.sender);

        usersCount++;
        UserMapping[msg.sender] = User(msg.sender, _name, _age, "Maharashtra", _aadharNumber, _panNumber, _document, "user@example.com");
        users.push(msg.sender);

        buyersCount++;
        BuyerMapping[msg.sender] = Buyer(msg.sender, _name, _age, "Maharashtra", _aadharNumber, _panNumber, _document, "user@example.com");
        buyers.push(msg.sender);

        emit Registration(msg.sender);
    }

    function registerBuyer(string memory _name, uint _age, string memory _city, string memory _aadharNumber, string memory _panNumber, string memory _document, string memory _email) public {
        require(!RegisteredAddressMapping[msg.sender], "Address already registered");

        RegisteredAddressMapping[msg.sender] = true;
        RegisteredBuyerMapping[msg.sender] = true;
        RegisteredSellerMapping[msg.sender] = true;
        RegisteredUserMapping[msg.sender] = true;

        buyersCount++;
        BuyerMapping[msg.sender] = Buyer(msg.sender, _name, _age, _city, _aadharNumber, _panNumber, _document, _email);
        buyers.push(msg.sender);

        usersCount++;
        UserMapping[msg.sender] = User(msg.sender, _name, _age, _city, _aadharNumber, _panNumber, _document, _email);
        users.push(msg.sender);

        sellersCount++;
        SellerMapping[msg.sender] = Seller(msg.sender, _name, _age, _aadharNumber, _panNumber, "0", _document);
        sellers.push(msg.sender);

        emit Registration(msg.sender);
    }

    function getUsers() public view returns (address[] memory) { return users; }
    function getSeller() public view returns (address[] memory) { return sellers; }
    function getBuyer() public view returns (address[] memory) { return buyers; }

    function getUserDetails(address i) public view returns (string memory, uint, string memory, string memory, string memory, string memory, string memory) {
        return (UserMapping[i].name, UserMapping[i].age, UserMapping[i].city, UserMapping[i].aadharNumber, UserMapping[i].panNumber, UserMapping[i].document, UserMapping[i].email);
    }

    function getSellerDetails(address i) public view returns (string memory, uint, string memory, string memory, string memory, string memory) {
        return (SellerMapping[i].name, SellerMapping[i].age, SellerMapping[i].aadharNumber, SellerMapping[i].panNumber, SellerMapping[i].landsOwned, SellerMapping[i].document);
    }

    function getBuyerDetails(address i) public view returns (string memory, string memory, string memory, string memory, string memory, uint, string memory) {
        return (BuyerMapping[i].name, BuyerMapping[i].city, BuyerMapping[i].panNumber, BuyerMapping[i].document, BuyerMapping[i].email, BuyerMapping[i].age, BuyerMapping[i].aadharNumber);
    }

    // User Property Operations
    function addLand(
        uint _area,
        string memory _city,
        string memory _state,
        uint landPrice,
        uint _propertyPID,
        uint _surveyNum,
        string memory _ipfsHash,
        string memory _document
    ) public {
        require(isRegistered(msg.sender), "Must be registered user");
        require(isVerified(msg.sender), "User identity must be verified by Land Inspector");

        landsCount++;
        lands[landsCount] = Landreg(landsCount, _area, _city, _state, landPrice, _propertyPID, _surveyNum, _ipfsHash, _document);
        LandOwner[landsCount] = msg.sender;
        LandOnSale[landsCount] = false; // Pending legal verification by Land Inspector
        LandVerification[landsCount] = false;
        LandRejection[landsCount] = false;
        emit AddingLand(landsCount);
    }

    function listLandForSale(uint _landId, uint _price) public {
        require(LandOwner[_landId] == msg.sender, "Only owner can list land");
        require(LandVerification[_landId], "Land must be verified before listing");
        LandOnSale[_landId] = true;
        if (_price > 0) {
            lands[_landId].landPrice = _price;
        }
    }

    function cancelLandSale(uint _landId) public {
        require(LandOwner[_landId] == msg.sender, "Only owner can cancel listing");
        LandOnSale[_landId] = false;
    }

    // Purchase Requests
    function requestLand(address _sellerId, uint _landId) public {
        require(isRegistered(msg.sender), "Must be registered user");
        require(isVerified(msg.sender), "User must be verified to make purchase offers");
        require(LandOwner[_landId] != msg.sender, "Cannot purchase your own property");
        require(LandVerification[_landId], "Land is not yet verified by government");
        require(LandOnSale[_landId], "Land is not currently listed for sale");

        requestsCount++;
        RequestsMapping[requestsCount] = LandRequest(requestsCount, _sellerId, msg.sender, _landId);
        RequestStatus[requestsCount] = false;
        RequestRejected[requestsCount] = false;
        RequestedLands[requestsCount] = true;

        emit Landrequested(_sellerId, msg.sender, _landId);
    }

    function getRequestDetails(uint i) public view returns (address, address, uint, bool) {
        return (RequestsMapping[i].sellerId, RequestsMapping[i].buyerId, RequestsMapping[i].landId, RequestStatus[i]);
    }

    function isRequested(uint _id) public view returns (bool) {
        return RequestedLands[_id];
    }

    function isApproved(uint _id) public view returns (bool) {
        return RequestStatus[_id];
    }

    function isRequestRejected(uint _id) public view returns (bool) {
        return RequestRejected[_id];
    }

    function approveRequest(uint _reqId) public {
        uint landId = RequestsMapping[_reqId].landId;
        require(LandOwner[landId] == msg.sender, "Only the property owner can accept this request");
        RequestStatus[_reqId] = true;
        RequestRejected[_reqId] = false;
        emit requestApproved(_reqId);
    }

    function rejectRequest(uint _reqId) public {
        uint landId = RequestsMapping[_reqId].landId;
        require(LandOwner[landId] == msg.sender, "Only the property owner can reject this request");
        RequestRejected[_reqId] = true;
        RequestStatus[_reqId] = false;
        emit requestRejected(_reqId);
    }

    function cancelRequest(uint _reqId) public {
        require(RequestsMapping[_reqId].buyerId == msg.sender, "Only the requesting user can cancel this request");
        require(!RequestStatus[_reqId], "Cannot cancel an already accepted request");
        RequestedLands[_reqId] = false;
        emit requestCancelled(_reqId);
    }

    // Payment & Automated Ownership Transfer
    function isPaid(uint _landId) public view returns (bool) {
        return PaymentReceived[_landId];
    }

    function payment(address payable _receiver, uint _landId) public payable {
        require(LandOwner[_landId] == _receiver, "Receiver is not current owner");
        require(LandOwner[_landId] != msg.sender, "Cannot purchase your own property");
        
        // Transfer funds to seller
        _receiver.transfer(msg.value);

        // Mark payment received and delist
        PaymentReceived[_landId] = true;
        LandOnSale[_landId] = false;

        // AUTOMATIC OWNERSHIP TRANSFER
        address previousOwner = LandOwner[_landId];
        LandOwner[_landId] = msg.sender;

        // Record on-chain transaction history
        transactionsCount++;
        transactionRecords[transactionsCount] = TransactionRecord(
            transactionsCount,
            _landId,
            previousOwner,
            msg.sender,
            msg.value,
            now
        );

        emit PaymentCompleted(_landId, msg.sender, _receiver, msg.value);
        emit OwnershipTransferred(_landId, previousOwner, msg.sender);
    }

    function getTransactionRecord(uint _txId) public view returns (uint, uint, address, address, uint, uint) {
        TransactionRecord memory rec = transactionRecords[_txId];
        return (rec.txId, rec.landId, rec.seller, rec.buyer, rec.amount, rec.timestamp);
    }

    // Land Inspector Title Transfer (Manual override if needed)
    function LandOwnershipTransfer(uint _landId, address _newOwner) public onlyInspector {
        address prev = LandOwner[_landId];
        LandOwner[_landId] = _newOwner;
        emit OwnershipTransferred(_landId, prev, _newOwner);
    }
}
