import { Tokens } from "./contracts/contracts"

interface config {
    slippage: number,
    firstToken: Tokens,
    secondToken: Tokens
}

export const config: config = {
    slippage: 0.1,  //slippage в процентах ПРИМЕР 30/ 0.1 СТРОГО больше 0.1
    firstToken: 'USDT',
    secondToken: 'USDC' 
}