# sync-with-common-urban-obs-vocab

Intented to be run on a schedule, e.g. a Kubernetes CronJob. It gets the common Urban Observatory JSON vocabulary file, and ensures that we have a record of each definition within our own databases. For example it makes sure the Disciplines and Observable Properties are synced.


## Deploying changes to Kubernetes on GCP

1. Commit any changes
2. Run `npm version major/minor/patch`
3. Run `npm run dockerise`. It will use the version number as the tag for the container.
4. Have kubernetes use the new version, e.g. by initiating a rolling update via the GCP web console, or updating the version number in a local YAML file and running `kubectl apply -f my-yaml-file.yaml`.