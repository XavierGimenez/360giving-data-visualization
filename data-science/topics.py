# Author: Xavi Gimenez xavi@xavigimenez.net


from __future__ import print_function

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import NMF
import pandas as pd
import numpy as np
import json
import io
import codecs

try:
    to_unicode = unicode
except NameError:
    to_unicode = str


with open('config.json') as json_config_file:
    config = json.load(json_config_file)

ngram_join_string = config['ngram_join_string']   # instead of use ngrams > 1 to mantain some multiword tokens as key word,
                                                  # just join them with a special string and later split again
folder_data_source = './data-source/'
folder_data_output = './data-output/'
folder_data_output_fundingorgs = './data-output/topics_fundingorgs'


# get englishh stop words from:
# https://github.com/scikit-learn/scikit-learn/blob/master/sklearn/feature_extraction/stop_words.py
# and add our custom list to the set
ENGLISH_STOP_WORDS = frozenset([
    "a", "about", "above", "across", "after", "afterwards", "again", "against",
    "all", "almost", "alone", "along", "already", "also", "although", "always",
    "am", "among", "amongst", "amoungst", "amount", "an", "and", "another",
    "any", "anyhow", "anyone", "anything", "anyway", "anywhere", "are",
    "around", "as", "at", "back", "be", "became", "because", "become",
    "becomes", "becoming", "been", "before", "beforehand", "behind", "being",
    "below", "beside", "besides", "between", "beyond", "bill", "both",
    "bottom", "but", "by", "call", "can", "cannot", "cant", "co", "con",
    "could", "couldnt", "cry", "de", "describe", "detail", "do", "done",
    "down", "due", "during", "each", "eg", "eight", "either", "eleven", "else",
    "elsewhere", "empty", "enough", "etc", "even", "ever", "every", "everyone",
    "everything", "everywhere", "except", "few", "fifteen", "fifty", "fill",
    "find", "fire", "first", "five", "for", "former", "formerly", "forty",
    "found", "four", "from", "front", "full", "further", "get", "give", "go",
    "had", "has", "hasnt", "have", "he", "hence", "her", "here", "hereafter",
    "hereby", "herein", "hereupon", "hers", "herself", "him", "himself", "his",
    "how", "however", "hundred", "i", "ie", "if", "in", "inc", "indeed",
    "interest", "into", "is", "it", "its", "itself", "keep", "last", "latter",
    "latterly", "least", "less", "ltd", "made", "many", "may", "me",
    "meanwhile", "might", "mill", "mine", "more", "moreover", "most", "mostly",
    "move", "much", "must", "my", "myself", "name", "namely", "neither",
    "never", "nevertheless", "next", "nine", "no", "nobody", "none", "noone",
    "nor", "not", "nothing", "now", "nowhere", "of", "off", "often", "on",
    "once", "one", "only", "onto", "or", "other", "others", "otherwise", "our",
    "ours", "ourselves", "out", "over", "own", "part", "per", "perhaps",
    "please", "put", "rather", "re", "same", "see", "seem", "seemed",
    "seeming", "seems", "serious", "several", "she", "should", "show", "side",
    "since", "sincere", "six", "sixty", "so", "some", "somehow", "someone",
    "something", "sometime", "sometimes", "somewhere", "still", "such",
    "system", "take", "ten", "than", "that", "the", "their", "them",
    "themselves", "then", "thence", "there", "thereafter", "thereby",
    "therefore", "therein", "thereupon", "these", "they", "thick", "thin",
    "third", "this", "those", "though", "three", "through", "throughout",
    "thru", "thus", "to", "together", "too", "top", "toward", "towards",
    "twelve", "twenty", "two", "un", "under", "until", "up", "upon", "us",
    "very", "via", "was", "we", "well", "were", "what", "whatever", "when",
    "whence", "whenever", "where", "whereafter", "whereas", "whereby",
    "wherein", "whereupon", "wherever", "whether", "which", "while", "whither",
    "who", "whoever", "whole", "whom", "whose", "why", "will", "with",
    "within", "without", "would", "yet", "you", "your", "yours", "yourself",
    # add our own custom stop-words list
     'access',
     'activity',
     'area',
     'available',
     'awareness',
     'beneficiaries',
     'beneficiary',
     'bring',
     'buy',
     'charity',
     'continuation',
     'contributed',
     'currently',
     'develop',
     'development',
     'enable',
     'england',
     'expenses',
     'explore',
     'extend',
     'free',
     'fund',
     'funding',
     'grant',
     'grants',
     'group',
     'groups',
     'improve',
     'increase',
     'information',
     'information',
     'install',
     'issue',
     'issues',
     'lists',
     'local',
     'make',
     'main',
     'money',
     'new',
     'number',
     'number',
     'pay',
     'placeholder',
     'placeholder',
     'programme',
     'project',
     'provide',
     'provided',
     'provides',
     'purchase',
     'range',
     'recipient',
     'recipients',
     'resources',
     'scheme',
     'support',
     'titled',
     'use',
     'yourselves',
     'work'
    ])




# ------------------------------------------------------------------------
# functions

def print_top_words(model, feature_names, n_top_words):
    for topic_idx, topic in enumerate(model.components_):
        message = "Topic #%d: " % topic_idx

        # arg sort returns the indices that would sort an array
        # in ascending order. We want the reverse, and then get
        # the terms for the top indices
        message += " ".join([feature_names[i] for i in topic.argsort()[:-n_top_words - 1:-1]])
        print(message)
        print(" ".join(str(topic[i]) for i in topic.argsort()[:-n_top_words - 1:-1]))


def display_topics(H, W, feature_names, documents, n_top_words, n_top_documents):

    for topic_idx, topic in enumerate(H):
        print(' ')
        print(' ')
        message = "Topic %d:" % topic_idx
        message += " ".join([feature_names[i] for i in topic.argsort()[:-n_top_words - 1:-1]])

        print(message)
        print(" ".join(str(topic[i]) for i in topic.argsort()[:-n_top_words - 1:-1]))

        top_doc_indices = np.argsort(W[:, topic_idx])[::-1][0:n_top_documents]
        print(
            " ".join(
                str(W[:,topic_idx][i]) for i in np.argsort( W[:,topic_idx] )[::-1][0:n_top_documents]
            )
          )
        for doc_index in top_doc_indices:
            print('grant:')
            print(dataset.at[doc_index, 'Identifier'])
            print(documents[doc_index])




# ------------------------------------------------------------------------
# load data

print("Loading dataset...")
dataset = pd.read_csv('./data-source/grantnav-20180613122257.csv', encoding='utf-8')


# ------------------------------------------------------------------------
# data pre-processing

# get sure we have valid data
dataset = dataset[dataset['Title'].notnull()]
dataset = dataset[dataset['Description'].notnull()]
#dataset = dataset[:config['n_samples']]

# there are 'massive-granting-days': a lot of grants with the same Award date
# coming from the same Funding Organization, all sharing the same title and
# description, but with different awarded amounts: this can distort the topic
# analysis and later aggregations and vizs, so group them and manage them
# as single grants: we loose the grant id and the amount are sumed up
dataset = dataset.groupby(
    ['Title', 'Description', 'Award Date', 'Funding Org:Identifier', 'Funding Org:Name']).agg({
        'Amount Awarded': sum,
        'Identifier': 'first'   # consider if counting this is correct...
     }).reset_index()

#save list of funding orgs
orgs = dataset.groupby(['Funding Org:Identifier', 'Funding Org:Name']).agg({'Identifier': 'first'}).reset_index()
orgs[['Funding Org:Identifier', 'Funding Org:Name']].to_csv(
    folder_data_output + 'fundingOrgs.csv',
    encoding='utf-8',
    sep=',',
    index=False
)

# new column with the 'documents' to use
# for keyword extraction
dataset['Document'] = dataset['Title'] + ' ' + dataset['Description']


# convert 'user-led' to a special word, in order
# to keep it outside the pre-processing phase
dataset['Document'] = dataset['Document'].str.replace('user-led', 'user' + ngram_join_string + 'led')

# do the same for other words that should be considered as n-grams
dataset['Document'] = dataset['Document'].str.replace('Second World War', 'Second' + ngram_join_string + 'World' + ngram_join_string + 'War')

# fix some pluralizations...
dataset['Document'] = dataset['Document'].str.replace('schools', 'school')

# TODO: add more pluralization

# TODO: pending to remove numbers!
# maybe replace all number by a reserved word that can be a stop-word
# https://stackoverflow.com/questions/45547568/how-can-i-prevent-tfidfvectorizer-to-get-numbers-as-vocabulary

data_samples = dataset['Document'].tolist()

# ------------------------------------------------------------------------
# Get matrix of TF-IDF features and get topics

# Load the dataset and vectorize it. We use a few heuristics
# to filter out useless terms early on: the posts are stripped of headers,
# footers and quoted replies, and common English words, words occurring in
# only one document or in at least 95% of the documents are removed.

# Use tf-idf features for NMF
print("Extracting tf-idf features for NMF...")
tfidf_vectorizer = TfidfVectorizer(
    max_df=0.95,
    min_df=2,
    max_features=config['n_features'],
    stop_words=ENGLISH_STOP_WORDS)

tfidf = tfidf_vectorizer.fit_transform(data_samples)

# Fit the NMF model
print("Fitting the NMF model (Frobenius norm) with tf-idf features, "
      " n_features=%d..." % config['n_features'])

nmf = NMF(
    n_components=config['n_components'],
    random_state=1,
    alpha=.1,
    l1_ratio=.5
).fit(tfidf)

print("\nTopics in NMF model (Frobenius norm):")
tfidf_feature_names = tfidf_vectorizer.get_feature_names()
print_top_words(nmf, tfidf_feature_names, config['n_top_words'])


nmf_W = nmf.transform(tfidf)
nmf_H = nmf.components_

print('Shape of the matrix W (documents x topics)')
print(nmf_W.shape)
print('Shape of the matrix H: (topics x samples)')
print(nmf_H.shape)

#display_topics(nmf_H, nmf_W, tfidf_feature_names, data_samples, config['n_top_words'], config['n_top_documents'])



# ------------------------------------------------------------------------
# save data
for topic_idx, topic in enumerate(nmf_H):

    # save tuples of topic words and weights
    topic_words = list(
        tfidf_feature_names[i] for i in topic.argsort()[:-config['n_top_words'] - 1:-1]
    )
    topic_weights = list(
        topic[i] for i in topic.argsort()[:-config['n_top_words']- 1:-1]
    )

    with io.open(folder_data_output + 'topic' + str(topic_idx) + '_keywords.json', 'w', encoding='utf8') as outfile:
        str_ = json.dumps(
            {
                'topic_words'   : topic_words,
                'topic_weights' : topic_weights
            },
            indent=4,
            sort_keys=True,
            separators=(',', ': '),
            ensure_ascii=False
        )
        outfile.write(to_unicode(str_))

    top_doc_indices = np.argsort(nmf_W[:, topic_idx])[::-1][0:config['n_top_documents']]

    # weights (ordered)
    ordered_weights = list(
        nmf_W[:, topic_idx][i] for i in top_doc_indices
    )

    # slice rows by all grants related to the topic
    # and slice only columns we are interested at
    df_topic = dataset.ix[
               top_doc_indices,
               ['Identifier', 'Title', 'Description', 'Award Date', 'Amount Awarded', 'Funding Org:Identifier', 'Funding Org:Name']
    ]

    # add columm with the documents weights
    df_topic['DocumentWeight'] = ordered_weights

    if config['group_funding_org'] == 1 :
        print('saving contribution to the topic by funding org')
        # save contribution to the topic at funding org level
        for fundingOrgIdentifier in dataset['Funding Org:Identifier'].unique():
            print(fundingOrgIdentifier)
            df_topicOrg = df_topic[df_topic['DocumentWeight'] > 0]
            df_topicOrg = df_topicOrg[df_topicOrg['Funding Org:Identifier'] == fundingOrgIdentifier]
            df_topicOrg.to_csv(
                folder_data_output_fundingorgs + 'fundingOrg_' + fundingOrgIdentifier + '_topic' + str(topic_idx) + '_documents.csv',
                encoding='utf-8',
                sep=',',
                index=False
            )
    else :
        # save only docs that have some weight
        # related to the topic which is significant:
        # slice by docs with weight > 0 and get a
        # threshold by calculating a percentile to
        # discard lower values
        percentile = 50
        weight_lower_threshold = np.percentile(
            df_topic[df_topic['DocumentWeight'] > 0]['DocumentWeight'],
            percentile
        )

        #save only weight above the 20th percentile
        df_topic = df_topic[df_topic['DocumentWeight'] >= weight_lower_threshold]

        df_topic.to_csv(
            folder_data_output + 'topic' + str(topic_idx) + '_documents.csv',
            encoding='utf-8',
            sep=',',
            index=False
        )