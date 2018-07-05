# Author: Xavi Gimenez xavi@xavigimenez.net


from __future__ import print_function

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import NMF
from dateutil import parser
import pandas as pd
import numpy as np


n_samples = 10
n_features = 1000
n_components = 15           # topics
n_top_words = 15            # words per topic
n_top_documents = 50        # docs per topic
ngram_join_string = 'xyz'   # instead of use ngrams > 1 to mantain some multiword tokens as key word,
                            # just join them with a special string and later split again


# get enligh stop words from:
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



def print_top_words(model, feature_names, n_top_words):
    for topic_idx, topic in enumerate(model.components_):
        message = "Topic #%d: " % topic_idx
        message += " ".join([feature_names[i]
                             for i in topic.argsort()[:-n_top_words - 1:-1]])
        print(message)
    print()

def display_topics(H, W, feature_names, documents, n_top_words, n_top_documents):
    for topic_idx, topic in enumerate(H):
        print("Topic %d:" % (topic_idx))
        print(" ".join([feature_names[i]
                        for i in topic.argsort()[:-n_top_words - 1:-1]]))
        top_doc_indices = np.argsort( W[:,topic_idx] )[::-1][0:n_top_documents]
        for doc_index in top_doc_indices:
            print(documents[doc_index])



# ------------------------------------------------------------------------
# load data

print("Loading dataset...")
dataset = pd.read_csv('./data-source/grantnav-20180613122257.csv')


# ------------------------------------------------------------------------
# data pre-processing

# get sure we have valid data
dataset = dataset[dataset['Title'].notnull()]
dataset = dataset[dataset['Description'].notnull()]

dataset = dataset[:n_samples]

# new column with the 'documents' to use
# for keyword extraction
dataset['Document'] = dataset['Title'] + ' ' + dataset['Description']

# parse 'Award Date' to year
def parseAwardData(row) :
    return parser.parse(row['Award Date']).year

dataset['Year'] = dataset.apply(parseAwardData, axis=1)



# convert 'user-led' to a special word, in order
# to keep it outside the pre-processing phase
dataset['Document'] = dataset['Document'].str.replace('user-led', 'user' + ngram_join_string + 'led')

# do the same for other words that should be considered as n-grams
dataset['Document'] = dataset['Document'].str.replace('Second World War', 'Second' + ngram_join_string + 'World' + ngram_join_string + 'War')

# fix some pluralizations...
dataset['Document'] = dataset['Document'].str.replace('schools', 'school')

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
    max_features=n_features,
    stop_words=ENGLISH_STOP_WORDS)

tfidf = tfidf_vectorizer.fit_transform(data_samples)

# Fit the NMF model
print("Fitting the NMF model (Frobenius norm) with tf-idf features, "
      "n_samples=%d and n_features=%d..." % (n_samples, n_features))

nmf = NMF(
    n_components=n_components,
    random_state=1,
    alpha=.1,
    l1_ratio=.5
).fit(tfidf)

print("\nTopics in NMF model (Frobenius norm):")
tfidf_feature_names = tfidf_vectorizer.get_feature_names()
print_top_words(nmf, tfidf_feature_names, n_top_words)


nmf_W = nmf.transform(tfidf)
nmf_H = nmf.components_

print('Shape of the matrix W (documents x topics)')
print(nmf_W.shape);
print('Shape of the matrix H: (topics x samples)')
print(nmf_H.shape);

display_topics(nmf_H, nmf_W, tfidf_feature_names, data_samples, n_top_words, n_top_documents)
