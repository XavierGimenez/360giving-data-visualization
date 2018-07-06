import pandas as pd
import numpy as np
import json
import io

folder_data_output = './data-output/'


with open('config.json') as json_config_file:
    config = json.load(json_config_file)

# loop through topics
for i in range(0, config['n_components']):
    df_topic = pd.read_csv('./data-output/topic' + str(i) + '_documents.csv')

    # remove rows with  null values
    df_topic = df_topic.dropna()

    # parsing the date string with a parser
    # is extremely slow, do it the dirty way
    df_topic['Year'] = df_topic['Award Date'].str.slice(0, 4)
#    df_topic['Year'] = df_topic['Year'].astype(int)

    df_topic['Month'] = df_topic['Award Date'].str.slice(5, 7)
#    df_topic['Month'] = df_topic['Month'].astype(int)

    df_topic['Date'] = df_topic['Year'] + '-' + df_topic['Month'] + '-01'

    agg = df_topic.groupby(['Year', 'Month']).agg(
        {'Amount Awarded': sum,
         'Identifier': 'count',
         'DocumentWeight': sum
         })

    # need to fill missing values in the time series...
    # https://stackoverflow.com/questions/44978196/pandas-filling-missing-dates-and-values-within-group/44978400

    # add our topic
    agg['Topic'] = 'topic' + str(i)

    print('aggregating topic ' + str(i))
    agg.reset_index().to_csv(
        folder_data_output + 'agg_topic' + str(i) + '.csv',
        sep=',',
        index = False
    )

