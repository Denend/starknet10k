export function makeDenominator(num: number) {
    const denominator = 1000
    const nominator = denominator * num
    return {nominator: nominator, denominator: denominator}
}