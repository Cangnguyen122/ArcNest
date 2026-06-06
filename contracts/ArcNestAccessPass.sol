// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ArcNestAccessPass is ERC721, Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    address public treasury;
    uint256 public price;
    uint256 public nextTokenId = 1;
    uint256 public totalMinted;
    uint256 public maxSupply;

    string private sharedTokenUri;
    string public contractURI;
    bool public metadataFrozen;

    /**
     * @notice Active representative token for a wallet.
     * @dev This stays reliable because the contract enforces max 1 pass per wallet.
     */
    mapping(address => uint256) public tokenOf;

    event AccessPassMinted(
        address indexed buyer,
        uint256 indexed tokenId,
        uint256 price
    );

    event AccessPassMintedFor(
        address indexed operator,
        address indexed recipient,
        uint256 indexed tokenId
    );

    event TreasuryUpdated(address indexed treasury);
    event PriceUpdated(uint256 price);
    event MaxSupplyUpdated(uint256 maxSupply);
    event SharedTokenURIUpdated(string tokenURI);
    event ContractURIUpdated(string contractURI);
    event MetadataFrozen();
    event ERC20Recovered(address indexed token, address indexed to, uint256 amount);

    constructor(
        address usdc_,
        address treasury_,
        uint256 price_,
        uint256 maxSupply_,
        string memory sharedTokenUri_
    ) ERC721("ArcNest Access Pass", "AAP") Ownable(msg.sender) {
        require(usdc_ != address(0), "USDC required");
        require(treasury_ != address(0), "Treasury required");
        require(maxSupply_ > 0, "Supply required");

        usdc = IERC20(usdc_);
        treasury = treasury_;
        price = price_;
        maxSupply = maxSupply_;
        sharedTokenUri = sharedTokenUri_;
    }

    /**
     * @notice Mint an ArcNest access pass with USDC.
     * @dev A wallet cannot mint while it already owns a pass.
     */
    function mint() external whenNotPaused nonReentrant returns (uint256 tokenId) {
        require(balanceOf(msg.sender) == 0, "Already owns a pass");
        require(totalMinted < maxSupply, "Sold out");

        if (price > 0) {
            usdc.safeTransferFrom(msg.sender, treasury, price);
        }

        tokenId = _mintPass(msg.sender);

        emit AccessPassMinted(msg.sender, tokenId, price);
    }

    /**
     * @notice Owner mint for contributors, testing, rewards, partners, or manual recovery.
     */
    function mintFor(address recipient)
        external
        onlyOwner
        whenNotPaused
        returns (uint256 tokenId)
    {
        require(recipient != address(0), "Recipient required");
        require(balanceOf(recipient) == 0, "Recipient already owns a pass");
        require(totalMinted < maxSupply, "Sold out");

        tokenId = _mintPass(recipient);

        emit AccessPassMintedFor(msg.sender, recipient, tokenId);
    }

    /**
     * @notice Access check for the app.
     */
    function hasActivePass(address account) external view returns (bool) {
        return balanceOf(account) > 0;
    }

    /**
     * @notice Compatibility with older app/ABI naming.
     * @dev In this version it means the wallet currently owns a pass.
     */
    function hasMinted(address account) external view returns (bool) {
        return balanceOf(account) > 0;
    }

    /**
     * @notice Compatibility alias for older app/ABI naming.
     */
    function mintedTokenId(address account) external view returns (uint256) {
        return tokenOf[account];
    }

    function setMaxSupply(uint256 newMaxSupply) external onlyOwner {
        require(newMaxSupply > maxSupply, "Can only increase supply");
        require(newMaxSupply >= totalMinted, "Below minted supply");

        maxSupply = newMaxSupply;

        emit MaxSupplyUpdated(newMaxSupply);
    }

    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "Treasury required");

        treasury = treasury_;

        emit TreasuryUpdated(treasury_);
    }

    function setPrice(uint256 price_) external onlyOwner {
        price = price_;

        emit PriceUpdated(price_);
    }

    /**
     * @notice Updates the shared metadata URI used by every token.
     * @dev Example: ipfs://bafy...metadataJsonCid
     */
    function setSharedTokenURI(string calldata sharedTokenUri_) external onlyOwner {
        require(!metadataFrozen, "Metadata frozen");

        sharedTokenUri = sharedTokenUri_;

        emit SharedTokenURIUpdated(sharedTokenUri_);
    }

    function setContractURI(string calldata contractURI_) external onlyOwner {
        require(!metadataFrozen, "Metadata frozen");

        contractURI = contractURI_;

        emit ContractURIUpdated(contractURI_);
    }

    function freezeMetadata() external onlyOwner {
        metadataFrozen = true;

        emit MetadataFrozen();
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function recoverERC20(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(token != address(0), "Token required");
        require(to != address(0), "Recipient required");

        IERC20(token).safeTransfer(to, amount);

        emit ERC20Recovered(token, to, amount);
    }

    function _mintPass(address recipient) internal returns (uint256 tokenId) {
        tokenId = nextTokenId;

        nextTokenId += 1;
        totalMinted += 1;

        _safeMint(recipient, tokenId);
    }

    /**
     * @notice Every ArcNest Access Pass uses the same metadata JSON.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        return sharedTokenUri;
    }

    /**
     * @dev Keeps tokenOf(wallet) reliable by enforcing max 1 pass per wallet.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        if (to != address(0) && from != to) {
            require(balanceOf(to) == 0, "Recipient already owns a pass");
        }

        address previousOwner = super._update(to, tokenId, auth);

        if (from != address(0) && tokenOf[from] == tokenId) {
            tokenOf[from] = 0;
        }

        if (to != address(0)) {
            tokenOf[to] = tokenId;
        }

        return previousOwner;
    }
}