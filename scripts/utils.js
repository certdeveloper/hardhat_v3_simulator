const bn = require('bignumber.js')
const { ethers } = require('hardhat')

exports.getMinTick = (tickSpacing) => Math.ceil(-887272 / tickSpacing) * tickSpacing
exports.getMaxTick = (tickSpacing) => Math.floor(887272 / tickSpacing) * tickSpacing
exports.getMaxLiquidityPerTick = (tickSpacing) =>
    ethers.BigNumber.from(2)
        .pow(128)
        .sub(1)
        .div((getMaxTick(tickSpacing) - getMinTick(tickSpacing)) / tickSpacing + 1)

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 })

// returns the sqrt price as a 64x96
exports.encodePriceSqrt = (reserve1, reserve0) => {
    return ethers.BigNumber.from(
        new bn(reserve1.toString())
            .div(reserve0.toString())
            .sqrt()
            .multipliedBy(new bn(2).pow(96))
            .integerValue(3)
            .toString()
    )
}
