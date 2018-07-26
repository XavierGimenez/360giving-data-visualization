fundingOrgs = ["GB-COH-04831118", "GB-CHC-210183", "GB-COH-RC000766", "GB-CHC-1075920", "GB-CHC-1140372", "360G-blf", "GB-CHC-1145988", "GB-CHC-299963", "GB-CHC-1111600", "GB-CHC-1089893", "GB-CHC-1052061", "GB-CHC-1102927", "GB-CHC-326568 ", "GB-SC-SC012710", "GB-CHC-1080418", "GB-CHC-1045304", "GB-LAE-BIR", "GB-CHC-1151621", "GB-COH-07991677", "GB-CHC-312800", "GB-SC-SC003558", "GB-COH-04530979", "GB-CHC-328524", "US-EIN-39-1916960", "GB-CHC-1066739", "360G-Gulbenkian", "GB-COH-02273708", "GB-CHC-1115476", "D18", "GB-CHC-1059652", "GB-CHC-1143711", "GB-COH-03340350", "GB-CHC-1145921", "GB-CHC-210169", "GB-CHC-1159982", "GB-LAS-DND", "GB-SC-SC002970", "GB-CHC-1103731", "GB-CHC-1144091", "GB-CHC-1158914", "GB-CHC-1107583", "GB-CHC-251988", "GB-CHC-01133342", "GB-CHC-1164021", "GB-CHC-1078217", "360G-ArcadiaFund", "D9", "GB-COH-RS007018", "GB-COH-03037449", "GB-CHC-1010656", "GB-CHC-1093844", "GB-CHC-295157", "GB-CHC-1081124", "GB-CHC-1035628", "GB-COH-03416658", "GB-COH-IP00525R", "GB-CHC-274100", "GB-CHC-327114", "GB-CHC-802052", "GB-CHC-200051", "GB-CHC-1105580", "GB-CHC-210037", "GB-LAE-SWK", "GB-LAE-BNE", "GB-CHC-230102", "GB-CHC-1123126", "GB-CHC-1009195", "GB-CHC-1161290", "GB-CHC-1156077", "GB-LAE-OXO", "GB-CHC-1065552", "GB-CHC-1123081", "GB-CHC-1156300", "GB-CHC-226446", "GB-SC-SC009481", "GB-LAE-TRF"]


from datetime import datetime
import pandas as pd
import json

folder_data_output = './data-output/topics_fundingorgs/aggs/'
minDate = None
maxDate = None

with open('config.json') as json_config_file:
    config = json.load(json_config_file)


for fundingOrg in fundingOrgs:
    # loop through topics
    aggs = []

    for i in range(0, config['n_components']):
        df_topic = pd.read_csv('./data-output/topics_fundingorgs/fundingOrg_' + fundingOrg + '_topic' + str(i) + '_documents.csv')

        # remove rows with  null values
        df_topic = df_topic.dropna()

        agg = {}
        agg['Topic'] = i
        agg['DocumentWeight'] = df_topic['DocumentWeight'].sum()
        agg['Amount Awarded'] = df_topic['Amount Awarded'].sum()
        agg['Identifier'] = df_topic['DocumentWeight'].shape[0]
        aggs.append(agg)

    with open(folder_data_output + fundingOrg + '_topic_agg.json', 'w') as outfile:
        json.dump(aggs, outfile)