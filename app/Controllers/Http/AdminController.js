'use strict'

const Admin = use('App/Models/Admin')
const {validateAll} = use('Validator')

class AdminController {

    create({view}) {
        /**
         * Render the view 'user.create'.
         *
         * ref: http://adonisjs.com/docs/4.1/views
         */
        return view.render('admin.create')
    }

    async store({auth, session, request, response}) {
        /**
         * Getting needed parameters.
         *
         * ref: http://adonisjs.com/docs/4.1/request#_only
         */
        const data = request.only(['username', 'email', 'password', 'password_confirmation'])

        const validation = await validateAll(data, {
            username: 'required|unique:admins',
            email: 'required|email|unique:admins',
            password: 'required',
            password_confirmation: 'required_if:password|same:password',
        })

        /**
         * If validation fails, early returns with validation message.
         */
        if (validation.fails()) {
            session
                .withErrors(validation.messages())
                .flashExcept(['password'])

            return response.redirect('back')
        }

        // Deleting the confirmation field since we don't
        // want to save it
        delete data.password_confirmation

        /**
         * Creating a new user into the database.
         *
         * ref: http://adonisjs.com/docs/4.1/lucid#_create
         */
        const admin = await Admin.create(data)

        // Authenticate the user
        await auth.login(admin)

        return response.redirect('/')
    }
}

module.exports = AdminController
