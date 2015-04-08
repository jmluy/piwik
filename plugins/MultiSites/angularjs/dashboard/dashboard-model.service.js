/**
 * Model for Multisites Dashboard aka All Websites Dashboard.
 */
(function () {
    angular.module('piwikApp').factory('multisitesDashboardModel', multisitesDashboardModel);

    multisitesDashboardModel.$inject = ['piwikApi', '$filter', '$timeout'];

    function multisitesDashboardModel(piwikApi, $filter, $timeout) {

        // those sites are going to be displayed
        var model = {
            sites        : [],
            isLoading    : false,
            pageSize     : 25,
            currentPage  : 0,
            totalVisits  : '?',
            totalActions : '?',
            totalRevenue : '?',
            searchTerm   : '',
            lastVisits   : '?',
            lastVisitsDate : '?',
            numberOfSites : 0,
            updateWebsitesList: updateWebsitesList,
            getNumberOfFilteredSites: getNumberOfFilteredSites,
            getNumberOfPages: getNumberOfPages,
            getCurrentPagingOffsetStart: getCurrentPagingOffsetStart,
            getCurrentPagingOffsetEnd: getCurrentPagingOffsetEnd,
            previousPage: previousPage,
            nextPage: nextPage,
            searchSite: searchSite,
            sortBy: sortBy,
            reverse: true,
            sortColumn: 'nb_visits',
            fetchAllSites: fetchAllSites
        };

        fetchPreviousSummary();

        return model;

        function onError () {
            model.errorLoadingSites = true;
            model.sites = [];
        }

        function updateWebsitesList(report) {
            if (!report) {
                onError();
                return;
            }

            var allSites = report.sites;
            angular.forEach(allSites, function (site, index) {
                site.visits_evolution    = parseInt(site.visits_evolution, 10);
                site.pageviews_evolution = parseInt(site.pageviews_evolution, 10);
                site.revenue_evolution   = parseInt(site.revenue_evolution, 10);
            });

            model.totalActions  = report.totals.nb_pageviews;
            model.totalActions  = report.totals.nb_pageviews;
            model.totalVisits   = report.totals.nb_visits;
            model.totalRevenue  = report.totals.revenue;
            model.numberOfSites = report.numSites;
            model.sites = allSites;
        }

        function getNumberOfFilteredSites () {
            return model.numberOfSites; // todo
        }

        function getNumberOfPages() {
            return Math.ceil(getNumberOfFilteredSites() / model.pageSize - 1);
        }

        function getCurrentPagingOffsetStart() {
            return Math.ceil(model.currentPage * model.pageSize);
        }

        function getCurrentPagingOffsetEnd() {
            var end = getCurrentPagingOffsetStart() + parseInt(model.pageSize, 10);
            var max = getNumberOfFilteredSites();
            if (end > max) {
                end = max;
            }
            return parseInt(end, 10);
        }

        function previousPage() {
            model.currentPage = model.currentPage - 1;
            fetchAllSites();
        }

        function sortBy(metric) {
            if (model.sortColumn == metric) {
                model.reverse = !model.reverse;
            }

            model.sortColumn = metric;
            fetchAllSites();
        };

        function previousPage() {
            model.currentPage = model.currentPage - 1;
            fetchAllSites();
        }

        function nextPage() {
            model.currentPage = model.currentPage + 1;
            fetchAllSites();
        }

        function searchSite (term) {
            model.searchTerm  = term;
            model.currentPage = 0;
            fetchAllSites();
        }

        function fetchPreviousSummary () {
            piwikApi.fetch({
                method: 'API.getLastDate'
            }).then(function (response) {
                if (response && response.value) {
                    return response.value;
                }
            }).then(function (lastDate) {
                if (!lastDate) {
                    return;
                }

                model.lastVisitsDate = lastDate;

                return piwikApi.fetch({
                    method: 'API.getProcessedReport',
                    apiModule: 'MultiSites',
                    apiAction: 'getAll',
                    hideMetricsDoc: '1',
                    filter_limit: '0',
                    showColumns: 'label,nb_visits',
                    enhanced: 1,
                    date: lastDate
                });
            }).then(function (response) {
                if (response && response.reportTotal) {
                    model.lastVisits = response.reportTotal.nb_visits;
                }
            });
        }

        function fetchAllSites(refreshInterval) {

            if (model.isLoading) {
                piwikApi.abort();
            }

            model.isLoading = true;
            model.errorLoadingSites = false;

            var params = {
                module: 'MultiSites',
                action: 'getAllWithGroups',
                hideMetricsDoc: '1',
                filter_sort_order: 'asc',
                filter_limit: model.pageSize,
                filter_offset: getCurrentPagingOffsetStart(),
                showColumns: 'label,nb_visits,nb_pageviews,visits_evolution,pageviews_evolution,revenue_evolution,nb_actions,revenue'
            };

            if (model.searchTerm) {
                params.pattern = model.searchTerm;
            }

            if (model.sortColumn) {
                params.filter_sort_column = model.sortColumn;
            }

            if (model.reverse) {
                params.filter_sort_order = 'desc';
            }

            return piwikApi.fetch(params).then(function (response) {
                updateWebsitesList(response);
            }, onError)['finally'](function () {
                model.isLoading = false;

                if (refreshInterval && refreshInterval > 0) {
                    $timeout(function () {
                        fetchAllSites(refreshInterval);
                    }, refreshInterval * 1000);
                }
            });
        }
    }
})();
