import {graphql} from "@octokit/graphql";
import fs from 'fs';
import semverSort from "semver-sort";
import util from 'util';
//const semverSort = require('semver-sort');
// want to get the apis for Powerdns and tags and filter out things for what we want

const graphqlWithAuth = graphql.defaults({
    headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`
    }
});

async function versionsForProduct(productPrefix) {
    //Fixed query with actual ordering, gosh I'm dumb.
    const recursorVersions = await graphqlWithAuth(
        `
        query MyQuery {
            repository(name: "pdns", owner: "PowerDNS") {
              refs(refPrefix: "refs/tags/", first: 20, query: "${productPrefix}", orderBy: {
                field:TAG_COMMIT_DATE,
                direction: DESC
              }) {
                nodes {
                  name
                  prefix
                }
                totalCount
              }
            }
          }
        `
    );

    const version_nodes = recursorVersions.repository.refs.nodes;

    //Need to map the nodes into their name, and only the version, no product prefix
    const versions = version_nodes.map((node) => node.name.replace(productPrefix, ''));

    console.log(`Acquired 20 versions of ${productPrefix}: ${util.inspect(versions)}`);

    //Convert all the versions to semantic ones, and sort them
    const sorted = semverSort.desc(versions);

    const filtered = sorted.filter((item) => {
        //console.log(`Checking Version ${item}`);
        //If the name includes a hyphen, then it's got a alpha or pre-release we don't want
        return !item.includes('-');
    });
    //This list has been sorted to have the latest version at the top, regardless of date pushed
    console.log(`picked out ${filtered.at(0)}`);

    const latestStable = filtered.at(0);
    return latestStable;
}

const latestStableRecursor = await versionsForProduct("rec-");
const latestStableDnsdist = await versionsForProduct("dnsdist-");
const latestStableAuth = await versionsForProduct("auth-");

const data =
    `recursorVersion=${latestStableRecursor}
dnsdistVersion=${latestStableDnsdist}
authVersion=${latestStableAuth}`;

if (process.env.GITHUB_OUTPUT) {
    fs.writeFile(process.env.GITHUB_OUTPUT, data, (err) => {
        // In case of a error throw err.
        if (err) throw err;
    })
} else {
    console.log(data);
}