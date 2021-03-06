/* global adapterConfig, socket, systemLang, hosts, formatInfo, versionMap, mainHost, systemInformations, formatter, systemInfoForGithub, githubHelper */

const uptimeMap = {};

//------------------------------------------------------- UPDATE FIELDS -------------------------------------------------------------------

const updateInfoPage = async function () {
    $('#systemInfoList').empty();
    $('#systemInfoListLoader').remove();
    for (let currentHost in hosts) {
        getHostInfo(hosts[currentHost], function (data) {
            let text = '';
            if (data) {
                text += "<h3>" + data.hostname + "</h3>";
                text += "<dl class='dl-horizontal'>";
                for (let item in data) {
                    if (data.hasOwnProperty(item)) {
                        text += '<dt>' + _(item) + '</dt>';
                        if (item === 'Node.js') {
                            systemInfoForGithub += "Node.js: " + data[item] + "\r\n";
                            text += '<dd><span id="aktNodeVersion' + data.hostname + '">' + (formatInfo[item] ? formatInfo[item](data[item]) : data[item]) + '</span><span id="nodeExtraInfo' + data.hostname + '"></span></dd>';
                        } else {
                            if (item === 'NPM') {
                                systemInfoForGithub += "NPM: " + data[item] + "\r\n";
                            } else if (item === "Model") {
                                systemInfoForGithub += "Model: " + data[item] + "\r\n";
                            } else if (item === "RAM") {
                                systemInfoForGithub += "RAM: " + formatInfo[item](data[item]) + "\r\n";
                            }
                            text += '<dd' + ((item === 'Uptime' || item === 'System uptime') ? (" id='" + data.hostname + item + "' class='timeCounter' data-start='" + data[item] + "'") : "") + '>' + (formatInfo[item] ? formatInfo[item](data[item]) : data[item]) + '</dd>';
                        }
                    }
                }
                text += "</dl>";
            }
            if (text) {
                $('#systemInfoList').append(text);
                if (versionMap) {
                    getNodeExtrainfo(data.hostname);
                }
            }
        });
    }

    setInterval(function () {
        $(".timeCounter").each(function () {
            const key = $(this).attr("id");
            if (!(key in uptimeMap)) {
                uptimeMap[key] = $(this).data("start");
            }
            uptimeMap[key] = ++uptimeMap[key];
            $(this).text(formatter.formatSeconds(uptimeMap[key]));
        });
    }, 1000);


    getAdaptersInfo(mainHost, function (repository, installedList) {

        const listUpdatable = [];
        const listNew = [];
        const listHost = [];
        let adapter, obj;

        if (installedList) {
            let i = 0;
            for (adapter in installedList) {
                if (!installedList.hasOwnProperty(adapter)) {
                    continue;
                }
                obj = installedList[adapter];

                if (!obj || !obj.version || adapter === "hosts") {
                    continue;
                }

                if (adapter === "admin") {
                    systemInfoForGithub += "Admin: " + obj.version + "\r\n";
                } else if (obj.controller) {
                    i++;
                    systemInfoForGithub += "JS-Controller (" + i + "): " + obj.version + "\r\n";
                }

                let version = '';
                if (repository[adapter] && repository[adapter].version) {
                    version = repository[adapter].version;
                }
                if (!upToDate(version, obj.version)) {
                    if (obj.controller) {
                        listHost.push(adapter);
                    } else {
                        listUpdatable.push(adapter);
                    }
                }

            }
            listUpdatable.sort();

        }

        fillList('hostUpdate', listHost, repository, installedList);
        fillList('update', listUpdatable, repository, installedList);

        const now = new Date();
        for (adapter in repository) {
            if (!repository.hasOwnProperty(adapter)) {
                continue;
            }
            obj = repository[adapter];
            if (!obj || obj.controller) {
                continue;
            }
            if (installedList && installedList[adapter]) {
                continue;
            }
            if (!(obj.published && ((now - new Date(obj.published)) < 3600000 * 24 * 60))) {
                continue;
            }
            listNew.push(adapter);
        }
        listNew.sort();

        fillList('new', listNew, repository, installedList);

    });
};

$(function () {
    //------------------------------------------------------- FILL DATA -----------------------------------------------------------------------   
    readInstanceConfig(async function () {

        if (parent.window.location.hash === "#tab-info") {

            getHosts(await getNodeVersionList());

            if (adapterConfig.forum) {
                startForum();
            } else {
                $('#forumBlock').hide();
            }

            if (adapterConfig.news) {
                checkNewsLang();
                readAndWriteNewsData();
            } else {
                $('#newsBlock').hide();
            }

            if (!adapterConfig.clock) {
                startClock("start");
            } else {
                $('.clock').hide();
                $('.popandgit').addClass('col-sm-offset-3');
            }

            //adapterRequestIssueBlock
            searchAdaptersOnGithub();
            let blockCounter = [];
            if (adapterConfig.new_adapters) {
                blockCounter.push('#adapterSearchBlock');
            } else {
                $('#adapterSearchBlock').hide();
            }
            if (adapterConfig.adapter_request) {
                blockCounter.push('#adapterRequestBlock');
                showAdapterRequest();
            } else {
                $('#adapterRequestBlock').hide();
            }
            if (adapterConfig.adapter_issue) {
                blockCounter.push('#knownIssuesBlock');
                showIssues();
            } else {
                $('#knownIssuesBlock').hide();
            }

            if (blockCounter.length === 0) {
                $('#adapterRequestIssueBlock').hide();
            } else if (blockCounter.length === 1) {
                $(blockCounter[0]).removeClass().addClass("col-xs-12 col-sm-12 col-md-12 col-lg-12");
            } else if (blockCounter.length === 2) {
                $(blockCounter[0]).removeClass().addClass("col-xs-12 col-sm-12 col-md-6 col-lg-6");
                $(blockCounter[1]).removeClass().addClass("col-xs-12 col-sm-12 col-md-6 col-lg-6");
            }

            if (adapterConfig.documentation) {
                showDocumentation();
            } else {
                $('.rotate-button').hide();
            }

            if (adapterConfig.github_token) {
                if (adapterConfig.hide_github_myIssues) {
                    $('#myIssuesListOnGithub').remove();
                }
                if (adapterConfig.hide_github_myWatched) {
                    $('#myWatchedListOnGithub').remove();
                }
                if (adapterConfig.hide_github_myStarred) {
                    $('#myStarredListOnGithub').remove();
                }
                if (adapterConfig.hide_github_myAssigned) {
                    $('#myAssignedListOnGithub').remove();
                }
                githubHelper.getUserdata();
                $('#githubbuttonslist').removeClass('hidden');
            } else {
                $('#popupnews').css('margin-top', '-40px');
            }

            translateAll(systemLang);

            startPopupNews();

            systemInformations.getData();

        } else {
            socket.emit('unsubscribe', 'info.0.*');
            startClock("stop");
        }

    });
});