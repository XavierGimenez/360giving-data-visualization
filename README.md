# 360giving-data-visualization
360Giving Topic Modelling and Data Visualization for grantmaking themes

# 360giving

Topic modelling and Data Visualization for the 360giving Data Visualization Challenge

The code used in the analysis is available on [Github](https://github.com/XavierGimenez/360giving-data-visualization), with a Creative Commons 4.0 license. The dataset for this analysis is a data dump with all the grants published in the 360Giving standard

The analysis performs Topic Modelling by using an unsupervised text mining approach. Some fields of the dataset are used as 'text documents' in order to extract a set of k topics, each of which is represented by a set of most representative (top ranked) terms for the topic and associations (weights) for documents relative to the topic. 
The data is preprocessed by removing stop words plus a set of custom words present in the data but not relevant for describing topics.

The number of topics and number of terms for the topics is not fixed. For the analysis, 15 topics and 20 terms per topic have been set. For Topic Modelling, the Non-negative Matrix Factorization (NMF) algorithm has been used. The output of this approach results in terms with representative weights to all topics and grants with weights to all topics. For each topic, only a subset of its grants has been considering, removing those with weights with small relatedness (those with weights below the 50th percentile over the total).

For all topics and its grants, time-based aggregations are performed by counting nº of grants, its awarded amounts and its relatedness to each topic. As such, the awarded amount of a grant to a topic is 'relative' since the grant has a specific weight/relativeness to that topic. For the sake of implicity, aggregations sum the amounts without weighting them, but refactoring the funding amount by applying this 'weight' factors could lead to a possible better aproximation of grant's contribution to themes.
