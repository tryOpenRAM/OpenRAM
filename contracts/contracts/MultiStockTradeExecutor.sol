// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20MultiStock {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IPermit2MultiStock {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

interface IUniversalRouterMultiStock {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

/// @notice Exact-amount purchases of a conservative, liquid Robinhood Stock Token basket.
/// @dev Every successful call transfers the canonical token to the buyer and emits
///      a decoded StockPurchased event for Blockscout.
contract MultiStockTradeExecutor {
    struct PathKey {
        address intermediateCurrency;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
        bytes hookData;
    }

    struct ExactInputParams {
        address currencyIn;
        PathKey[] path;
        uint256[] minHopPriceX36;
        uint128 amountIn;
        uint128 amountOutMinimum;
    }

    address public constant UNIVERSAL_ROUTER = 0x8876789976dEcBfCbBbe364623C63652db8C0904;
    address public constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address public constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    address public constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address public constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;
    address public constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address public constant MSFT = 0xe93237C50D904957Cf27E7B1133b510C669c2e74;
    address public constant SPY = 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C;
    address public constant META = 0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35;
    address public constant GOOGL = 0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3;

    uint24 public constant POOL_FEE = 3000;
    int24 public constant TICK_SPACING = 60;

    bool private entered;

    event StockPurchased(
        address indexed buyer,