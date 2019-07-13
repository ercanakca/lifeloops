'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route')

//Route.on('/').render('welcome')


Route.post('/api/register', 'ApiController.register')
Route.post('/api/login', 'ApiController.login').middleware(['auth:jwt'])

Route.get('/', 'PostController.index')

Route.group(() => {

    Route.get('/api/app-contract', 'ApiController.appContract')
    Route.post('/api/profile-update', 'ApiController.profileUpdate')
    Route.post('/api/user-environment-create', 'ApiController.userEnvironmentCreate')
    Route.get('/api/user-environment-list', 'ApiController.userEnvironmentList')
    Route.post('/api/user-environment-delete/:id', 'ApiController.userEnvironmentDelete')
    Route.get('/api/user-environmental-invitation-card', 'ApiController.userEnvironmentalInvitationCard')
    Route.post('/api/place-create', 'ApiController.placeCreate')
    Route.post('/api/place-update/:id', 'ApiController.placeUpdate')
    Route.post('/api/place-delete/:id', 'ApiController.placeDelete')
    Route.get('/api/user-place-list', 'ApiController.placeList')
    Route.post('/api/add-user-environment', 'ApiController.addUserEnvironment')
    Route.post('/api/invitation-verify', 'ApiController.invitationVerify')
    Route.get('/api/user-environments', 'ApiController.userEnvironments')
    Route.get('/api/user-non-approved', 'ApiController.userNonAproved')
    Route.get('/api/user-approve', 'ApiController.userApprove')
    Route.post('/api/purchase-store', 'ApiController.purchaseStore')
    Route.post('/api/chat-create', 'ApiController.chatCreate')
    Route.post('/api/message-send', 'ApiController.messageSend')
    Route.post('/api/emergency', 'ApiController.emergency')

    Route.post('/api/last-geo-update', 'ApiController.lastGeoUpdate')
    Route.post('/api/location-follow', 'ApiController.locationFollow')


}).middleware(['auth:jwt'])

// Those routes should be only accessible
// when you are not logged in
Route.group(() => {
    Route.get('login', 'SessionController.create')
    Route.post('login', 'SessionController.store')

    Route.get('register', 'AdminController.create')
    Route.post('register', 'AdminController.store')
}).middleware(['guest'])

// Those routes should be only accessible
// when you are logged in
Route.group(() => {
    Route.get('logout', 'SessionController.delete')

    Route.get('posts/create', 'PostController.create')
    Route.post('posts', 'PostController.store')
    Route.get('posts/:id/edit', 'PostController.edit')
    Route.get('posts/:id/delete', 'PostController.delete')
    Route.put('posts/:id', 'PostController.update')
}).middleware(['auth:session'])








