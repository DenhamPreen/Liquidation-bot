import pandas as pd
import plotly.express as px
import seaborn as sns
from fitter import Fitter, get_common_distributions, get_distributions


historicalDataURL = '/Users/woosung/Desktop/Liquidation-bot/src/historical-price-analysis/cakebusd_data.csv'

# number of intervals between price updates i.e. 100 would be 100 x 20 = 2000 block numbers
historicalPeriodWindow = 100

def importHistoricalPrices():
    historicalPrices = pd.read_csv(historicalDataURL)
    # dropping last row because it is erroenous 
    historicalPrices.drop(historicalPrices.tail(1).index,inplace=True)
    return historicalPrices
    

def getHistoricalPricesInWindow(historicalPriceData, windowSize):
    # historicalPeriodWindow = number of intervals between price updates i.e. 100 would be 100 x 20 = 2000 block numbers
    return historicalPriceData.tail(windowSize)

def calculatePriceMovements(historicalPriceDataInWindow):

    historicalPriceDataInWindow.loc[:, 'price'] = historicalPriceDataInWindow.loc[:, 'reserve1'] / historicalPriceDataInWindow.loc[:, 'reserve0']
    historicalPriceDataInWindow.loc[:, 'price_change'] = historicalPriceDataInWindow['price'].pct_change()
    # historicalPriceDataInWindow.loc[:, 'reserve1_change'] = historicalPriceDataInWindow['reserve1'].pct_change()

    return historicalPriceDataInWindow

def plotPriceMovementsDistribution(historicalPriceMovementData):
    fig = px.histogram(historicalPriceMovementData, x="price_change", nbins = 10000)
    fig.show()
    
    fig3 = px.line(historicalPriceMovementData, x="block_number", y = "price")
    fig3.show()

    fig2 = px.line(historicalPriceMovementData, x="block_number", y = "price_change")
    fig2.show()

    # remove outliers
    fig4 = px.box(historicalPriceMovementData, y="price_change")
    fig4.show()  

    # sns.set_style('white')
    # sns.set_context("paper", font_scale = 2)
    # sns.displot(data=historicalPriceMovementData, x="reserve0_change", kind="hist", bins = 100, aspect = 1.5)

    return fig

def fitDistribution(historicalPriceMovementData):
    distribution = 0
    priceMovements = historicalPriceMovementData["price_change"].values

    f = Fitter(priceMovements,
           distributions=['gamma',
                          'lognorm',
                          "beta",
                          "burr",
                          "norm"])
    f.fit()
    print(f.summary())

    return None

def calculateProbabilityOfLiquidation(historicalPriceMovementData, currentPrice, liquidationPrice):
    priceMovementThresholdForLiq = (liquidationPrice - currentPrice) / currentPrice
    # print("Price movement threshold is: ", priceMovementThresholdForLiq)
    return 1 - (len(historicalPriceMovementData.loc[historicalPriceMovementData["price_change"] <= priceMovementThresholdForLiq]) / len(historicalPriceMovementData))

def calculateExpectedPayoffFromLiqAttempt(liquidationProbability, positionValue, liquidationReward, liqAttemptCost):
    liquidationPayoff = positionValue * liquidationReward
    expectedPayoff = liquidationProbability * liquidationPayoff - liqAttemptCost
    return expectedPayoff

def run(windowSize):
    historicalPriceData = importHistoricalPrices()

    historicalPriceDataInWindow = getHistoricalPricesInWindow(historicalPriceData, windowSize)
    # print(historicalPriceDataInWindow)

    historicalPriceMovementData = calculatePriceMovements(historicalPriceDataInWindow)
    # print(historicalPriceMovementData)
    
    # plotting distribution of price movements
    # plotPriceMovementsDistribution(historicalPriceMovementData)

    # fitDistribution(historicalPriceMovementData)

    liquidationProbability = calculateProbabilityOfLiquidation(historicalPriceMovementData, 10, 10.002)

    expectedPayoff = calculateExpectedPayoffFromLiqAttempt(liquidationProbability, 100)

    print(liquidationProbability)

run(3600)