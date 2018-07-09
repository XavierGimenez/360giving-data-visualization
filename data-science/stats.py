from datetime import datetime
import pandas as pd
import json

folder_data_output = './data-output/'
minDate = None
maxDate = None

with open('config.json') as json_config_file:
    config = json.load(json_config_file)




# loop through topics
dfs = []
aggs = []
for i in range(0, config['n_components']):
    df_topic = pd.read_csv('./data-output/topic' + str(i) + '_documents.csv')

    # remove rows with  null values
    df_topic = df_topic.dropna()

    # parsing the date string with a parser
    # is extremely slow, do it the dirty way
    df_topic['Year'] = df_topic['Award Date'].str.slice(0, 4)
    df_topic['Month'] = df_topic['Award Date'].str.slice(5, 7)

    # need to fill missing values in the time series, so:
    # https://stackoverflow.com/questions/44978196/pandas-filling-missing-dates-and-values-within-group/44978400
    # https://stackoverflow.com/questions/39316392/get-continuous-dataframe-in-pandas-by-filling-the-missing-month-with-0

    # get a column Date with format YYYY-MM-01
    df_topic['Date'] = df_topic['Year'] + '-' + df_topic['Month'] + '-01'

    # save date extents
    minDate = df_topic['Date'].min() if not minDate else min([minDate, df_topic['Date'].min()])
    maxDate = df_topic['Date'].max() if not maxDate else max([maxDate, df_topic['Date'].max()])

    # save dfs
    dfs.append(df_topic)

# get range of dates, monthly. This will be the new index of the dataframes
idx = pd.date_range(
    minDate,
    maxDate,
    freq='MS'
)

for i in range(0, config['n_components']):

    df_topic = dfs[i]

    # agg by date
    agg = df_topic.groupby(['Date']).agg(
        {'Amount Awarded': sum,
         'Identifier': 'count',
         'DocumentWeight': sum
         })

    # re-index
    agg.index = pd.DatetimeIndex(agg.index)
    agg = agg.reindex(idx, fill_value=0)

    # add our topic
    agg['Topic'] = 'topic' + str(i)

    print('aggregating topic ' + str(i))
    agg.reset_index().to_csv(
        folder_data_output + 'agg_topic' + str(i) + '.csv',
        sep=',',
        index=False
    )
    aggs.append(agg)

# output all the aggregates
pd.concat(aggs).reset_index().to_csv(
        folder_data_output + 'all_topics_agg.csv',
        sep=','
    )